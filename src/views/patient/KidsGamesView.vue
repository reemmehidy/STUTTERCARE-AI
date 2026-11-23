<script setup>
import { t } from '../../i18n'
import { computed, onBeforeUnmount, ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { session, addStars } from '../../stores/session'
import { createListener, recognitionSupported } from '../../utils/speech'
import { speechLang } from '../../i18n'
import { evaluateAttempt } from '../../utils/coachLogic'
import { games } from '../../data/mock'

const active = ref(null)
const i = ref(0)
const finished = ref(false)
const word = computed(() => active.value?.words[i.value])
function play(g) { active.value = g; i.value = 0; finished.value = false }
const listener = createListener(speechLang)
const listening = ref(false)
const msg = ref('')
async function advance() {
  try { await addStars(1) } catch { /* stars sync later */ }
  msg.value = ''
  if (i.value + 1 >= active.value.words.length) finished.value = true
  else i.value++
}
// Listens and only gives the star when the word was really said.
async function said() {
  if (!recognitionSupported) return advance()
  msg.value = ''; listening.value = true
  try {
    const r = await listener.listen()
    const ev = evaluateAttempt(r.alternatives.map((a) => a.text), word.value)
    if (ev.status === 'correct') await advance()
    else if (ev.status === 'silence') msg.value = 'I did not hear anything. Tap the button and try again.'
    else msg.value = `I heard "${ev.heard}". Try "${word.value}" again, slowly and softly.`
  } catch (e) {
    msg.value = e.code === 'not-allowed' ? 'Please allow the microphone to play.' : 'Microphone problem. Try again.'
  } finally { listening.value = false }
}
onBeforeUnmount(() => listener.stop())
</script>

<template>
  <PageHeader :title="t('Voice games')" :subtitle="t(`You have ${session.stars} stars`)" />
  <section v-if="active" class="panel play">
    <button class="back" @click="active = null">{{ t('All games') }}</button>
    <template v-if="!finished">
      <p class="muted">{{ active.title }} · {{ i + 1 }} {{ t('of') }} {{ active.words.length }}</p>
      <h2 class="word">{{ word }}</h2>
      <p class="muted">{{ t('Say it slowly with a soft start.') }}</p>
      <button class="pill sun" :disabled="listening" @click="said">{{ listening ? t('Listening...') : recognitionSupported ? t('Say it!') : t('I said it!') }}</button>
      <p v-if="msg" class="muted" role="status">{{ t(msg) }}</p>
    </template>
    <template v-else>
      <h2>{{ t('Great job!') }}</h2>
      <p class="muted">{{ t('You collected') }} {{ active.words.length }} {{ t('stars.') }}</p>
      <div class="row"><button class="pill" @click="play(active)">{{ t('Play again') }}</button><RouterLink to="/app/rewards" class="pill ghost">{{ t('See rewards') }}</RouterLink></div>
    </template>
  </section>
  <div v-else class="grid-3">
    <button v-for="g in games" :key="g.id" class="panel g" @click="play(g)"><h3>{{ g.title }}</h3><p class="muted">{{ t(g.desc) }}</p><span class="pill small">{{ t('Play') }}</span></button>
  </div>
</template>

<style scoped>
.g { text-align: start; font: inherit; cursor: pointer; display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
.g:hover { border-color: var(--brand); }
.play { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px 20px; text-align: center; }
.word { font-size: clamp(3rem, 12vw, 6rem); color: var(--brand); }
</style>
