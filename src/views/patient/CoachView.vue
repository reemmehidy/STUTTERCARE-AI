<script setup>
import { t } from '../../i18n'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import ArkanAvatar from '../../components/ArkanAvatar.vue'
import { session, addResult, saveProfile } from '../../stores/session'
import { createListener, speak, stopSpeaking, recognitionSupported } from '../../utils/speech'
import { evaluateAttempt, sayFor, personalize, WORDS, DRILL_TARGET, wordScore } from '../../utils/coachLogic'
import { lang, speechLang } from '../../i18n'

const S = () => sayFor(lang.value)
const isKid = computed(() => session.track === 'kids')
const callName = computed(() => session.user?.profile?.nickname || session.user?.name || '')
const nick = ref('')
const nickBusy = ref(false)
async function saveNick() {
  if (!nick.value.trim()) return
  nickBusy.value = true
  try { await saveProfile({ nickname: nick.value.trim() }) } catch (e) { error.value = e.message } finally { nickBusy.value = false }
}
const P = (text) => personalize(text, { name: callName.value, kid: isKid.value, lang: lang.value })

const pool = computed(() => WORDS[lang.value][session.track === 'kids' ? 'kids' : 'adults'])
const word = ref('')
const started = ref(false)
const messages = ref([])
const phase = ref('idle') // idle | speaking | listening | thinking | done
const drill = ref(false)
const streak = ref(0)
const misses = ref(0)
const silences = ref(0)
const autoListen = ref(true)
const error = ref('')
const saved = ref(false)
const wordsDone = ref(0)
const listRef = ref(null)

const listener = createListener(speechLang)
let seq = 0, mid = 0, startedAt = 0

const avatarState = computed(() => ({ speaking: 'speaking', listening: 'listening', done: 'happy' }[phase.value] ?? 'idle'))
const status = computed(() => ({
  idle: 'Tap "Talk to Arkan" when you are ready.',
  speaking: 'Arkan is talking...',
  listening: 'Listening... say the word',
  thinking: 'Checking...',
  done: 'Word finished'
}[phase.value]))

function push(from, text) {
  messages.value.push({ id: ++mid, from, text })
  nextTick(() => listRef.value?.scrollTo({ top: listRef.value.scrollHeight, behavior: 'smooth' }))
}
async function arkan(raw, { rate = 0.95 } = {}) {
  const text = P(raw)
  push('arkan', text)
  phase.value = 'speaking'
  await speak(text, { lang: speechLang, rate })
}
const stale = (my) => my !== seq

function newWord() {
  seq++; listener.stop(); stopSpeaking()
  started.value = true
  const options = pool.value.filter((w) => w !== word.value)
  word.value = options[Math.floor(Math.random() * options.length)]
  drill.value = false; streak.value = 0; misses.value = 0; silences.value = 0
  error.value = ''; saved.value = false
  startedAt = Date.now()
  begin(seq)
}
async function begin(my) {
  await arkan(S().intro(word.value))
  if (stale(my)) return
  await speak(word.value, { lang: speechLang, rate: 0.7 }) // model the word slowly
  if (stale(my)) return
  next(my)
}
const next = (my) => (autoListen.value ? listen(my) : (phase.value = 'idle'))

function talk() { seq++; stopSpeaking(); listener.stop(); listen(seq) }
function stop() { seq++; listener.stop(); stopSpeaking(); phase.value = 'idle' }
function hear() { seq++; listener.stop(); speak(word.value, { lang: speechLang, rate: 0.6 }); phase.value = 'idle' }

async function listen(my) {
  if (stale(my)) return
  error.value = ''
  phase.value = 'listening'
  let res
  try { res = await listener.listen() } catch (e) { return micError(e, my) }
  if (stale(my)) return
  phase.value = 'thinking'
  const alts = res.alternatives.map((a) => a.text)
  if (alts[0]) push('you', alts[0])
  await handle(evaluateAttempt(alts, word.value), my)
}

function micError(e, my) {
  if (stale(my) || e.code === 'aborted') return
  if (e.code === 'no-speech') return handle({ status: 'silence' }, my)
  phase.value = 'idle'
  error.value = {
    'not-allowed': 'Microphone access is blocked. Allow the microphone in your browser settings, then tap Talk.',
    'service-not-allowed': 'Microphone access is blocked. Allow the microphone in your browser settings, then tap Talk.',
    'audio-capture': 'No microphone was found. Connect one and try again.',
    network: 'Speech recognition needs an internet connection. Check it and try again.',
    unsupported: 'This browser cannot listen. Please use Chrome, Edge or Safari.'
  }[e.code] || 'Something went wrong with the microphone. Tap Talk to try again.'
}

async function handle(r, my) {
  if (r.status === 'silence') {
    silences.value++
    if (silences.value >= 2) { phase.value = 'idle'; return arkan(S().idle) }
    await arkan(S().silence(word.value))
    return stale(my) ? undefined : next(my)
  }
  silences.value = 0
  if (r.status === 'correct') {
    if (!drill.value) return finish(my, false)
    streak.value++
    if (streak.value >= DRILL_TARGET) return finish(my, false)
    await arkan(S().correctDrill(streak.value, DRILL_TARGET, word.value))
    return stale(my) ? undefined : next(my)
  }
  // wrong or close: switch to "repeat after me" practice
  misses.value++; streak.value = 0
  if (misses.value >= 6) return finish(my, true)
  drill.value = true
  const slow = misses.value >= 3
  await arkan(slow ? S().slower(word.value) : r.status === 'close' ? S().close(r.heard, word.value) : S().wrong(r.heard, word.value))
  if (stale(my)) return
  await speak(word.value, { lang: speechLang, rate: slow ? 0.45 : 0.55 })
  if (stale(my)) return
  await arkan(S().repeatAfter(word.value))
  if (!stale(my)) next(my)
}

async function finish(my, skipped) {
  phase.value = 'done'
  const score = wordScore(misses.value, skipped)
  wordsDone.value++
  await arkan(skipped ? S().skip : drill.value ? S().drillDone(word.value, DRILL_TARGET) : S().correctFirst(word.value))
  try {
    await addResult({ kind: 'coach', exerciseId: 'coach', word: word.value, attempts: misses.value + 1, score, duration: Math.round((Date.now() - startedAt) / 1000), measured: true })
    if (!stale(my)) saved.value = true
  } catch (e) { error.value = 'Your result could not be saved: ' + e.message }
  if (!stale(my)) phase.value = 'done'
}

// Switching language restarts the session so the coach, words and microphone all match.
watch(lang, () => { seq++; listener.stop(); stopSpeaking(); started.value = false; messages.value = []; phase.value = 'idle'; word.value = '' })
onBeforeUnmount(() => { seq++; listener.stop(); stopSpeaking() })
</script>

<template>
  <PageHeader :title="t('AI Speech Coach')" :subtitle="t('Say the word. Arkan listens, corrects you kindly, and practices it with you.')" />
  <p v-if="!recognitionSupported" class="notice warn" role="alert">{{ t('This browser cannot listen to speech. Please open StutterCare AI in Chrome, Edge or Safari.') }}</p>

  <div class="coach">
    <aside class="panel arkan">
      <ArkanAvatar :state="avatarState" :size="120" />
      <h2>{{ t('Arkan') }}</h2>
      <p class="muted">{{ t('Speech practice buddy') }}</p>
      <p class="muted small">{{ t('Every attempt matters. You do not need to speak quickly or avoid every pause.') }}</p>
      <label class="auto"><input v-model="autoListen" type="checkbox" /> {{ t('Listen automatically') }}</label>
    </aside>

    <section class="panel main">
      <div v-if="!started" class="start">
        <p>{{ t('Ready to practice? Arkan will give you a word and listen to you say it.') }}</p>
        <div v-if="isKid && !session.user?.profile?.nickname" class="nick">
          <label>{{ t('What should Arkan call you?') }}
            <input v-model="nick" maxlength="30" :placeholder="t('Your nickname')" @keyup.enter="saveNick" />
          </label>
          <button class="pill ghost small" :disabled="nickBusy || !nick.trim()" @click="saveNick">{{ t('Save') }}</button>
        </div>
        <button class="pill sun" :disabled="!recognitionSupported" @click="newWord">{{ t('Start practice') }}</button>
        <p class="muted small">{{ t('Arkan is an AI practice coach, not a doctor or therapist.') }}</p>
      </div>
      <template v-else>
        <div class="wordcard">
          <div><span class="muted small">{{ t('Practice word') }}</span><div class="word">{{ word }}</div></div>
          <button class="pill ghost small" @click="hear">{{ t('Hear the word') }}</button>
        </div>
        <div v-if="drill" class="dots" :aria-label="t('Repeat practice progress')">
          <span v-for="n in DRILL_TARGET" :key="n" :class="{ on: n <= streak }" />
          <small class="muted">{{ t('say it') }} {{ DRILL_TARGET }} {{ t('times in a row') }}</small>
        </div>
        <div ref="listRef" class="chat" aria-live="polite">
          <div v-for="m in messages" :key="m.id" :class="['bubble', m.from]">{{ m.text }}</div>
        </div>
        <p :class="['status', phase]" role="status">{{ t(status) }}</p>
        <p v-if="error" class="err" role="alert">{{ t(error) }}</p>
        <p v-if="saved" class="ok">{{ t('Saved to your progress.') }}</p>
        <div class="row">
          <button v-if="phase !== 'listening'" class="pill sun" :disabled="phase === 'thinking'" @click="talk">{{ t('Talk to Arkan') }}</button>
          <button v-else class="pill" @click="stop">{{ t('Stop') }}</button>
          <button :class="['pill', phase === 'done' ? '' : 'ghost']" @click="newWord">{{ phase === 'done' ? t('Next word') : t('New word') }}</button>
        </div>
      </template>
      <p class="notice priv">{{ t('Speech recognition is done by your browser (Chrome and Edge send audio to their speech service). StutterCare saves only your scores, never your voice recordings. This is practice feedback, not a diagnosis.') }}</p>
    </section>
  </div>
</template>

<style scoped>
.coach { display: grid; gap: 20px; }
@media (min-width: 860px) { .coach { grid-template-columns: 260px 1fr; align-items: start; } }
.arkan { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; }
.small { font-size: .85rem; }
.auto { margin-top: 10px; font-size: .9rem; display: flex; gap: 8px; align-items: center; }
.main { display: flex; flex-direction: column; gap: 14px; }
.nick { display: flex; gap: 10px; align-items: end; flex-wrap: wrap; justify-content: center; }
.nick input { display: block; margin-top: 6px; font: inherit; padding: 10px 14px; border-radius: 14px; border: 2px solid var(--line); }
.start { text-align: center; display: flex; flex-direction: column; gap: 16px; align-items: center; padding: 30px 0; }
.wordcard { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: var(--lav-soft); border-radius: 20px; padding: 16px 20px; flex-wrap: wrap; }
.word { font: 800 clamp(2.2rem, 8vw, 3.4rem) var(--font-display); color: var(--brand-deep); }
.dots { display: flex; gap: 8px; align-items: center; }
.dots span { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--brand); }
.dots span.on { background: var(--brand); }
.chat { display: flex; flex-direction: column; gap: 10px; max-height: 340px; overflow-y: auto; padding: 4px; }
.bubble { max-width: 85%; padding: 10px 16px; border-radius: 18px; line-height: 1.45; }
.bubble.arkan { background: var(--lav-soft); align-self: flex-start; border-bottom-left-radius: 4px; }
.bubble.you { background: var(--sun); color: var(--ink); align-self: flex-end; border-bottom-right-radius: 4px; }
.status { font-weight: 700; color: #5d5580; }
.status.listening { color: var(--brand); animation: pulse 1.2s infinite; }
@keyframes pulse { 50% { opacity: .45; } }
.err { color: var(--berry); }
.ok { color: #1c7a53; font-weight: 700; }
.priv { font-size: .8rem; margin-top: 6px; }
.notice.warn { background: #ffe9b0; margin-bottom: 16px; }
button:disabled { opacity: .5; cursor: not-allowed; }
</style>
