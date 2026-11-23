<script setup>
import { t } from '../../i18n'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '../../components/PageHeader.vue'
import { addResult, session } from '../../stores/session'
import { exercises, exerciseTitle } from '../../data/mock'
import { analyzeRecording } from '../../utils/analyzeSpeech'
import { createTranscriber, recognitionSupported } from '../../utils/speech'
import { speechLang } from '../../i18n'

const route = useRoute()
const router = useRouter()
const state = ref('idle') // idle | recording | processing
if (exercises.find((e) => e.id === route.params.id)?.premium && !session.user?.premium) router.replace('/app/premium')
const seconds = ref(0)
const levels = ref(Array(28).fill(8))
const error = ref('')
const title = computed(() => exerciseTitle(route.params.id))
const ex = computed(() => exercises.find((e) => e.id === route.params.id))
const CONVERSATION = ['story-time', 'feelings-talk']
const phrases = computed(() => ex.value?.phrases ?? [])
// Only read-aloud exercises are compared with their phrases; conversation prompts are not.
const compare = computed(() => (ex.value && !CONVERSATION.includes(ex.value.id) ? phrases.value : []))

let stream, ctx, analyser, raf, timer, sampler, timeBuf, freqBuf, raw = [], centroids = []
const transcriber = createTranscriber(speechLang)

async function start() {
  error.value = ''
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) } catch {
    error.value = 'Microphone access is blocked. Allow it in your browser settings and try again.'
    return
  }
  ctx = new AudioContext()
  analyser = ctx.createAnalyser(); analyser.fftSize = 1024
  ctx.createMediaStreamSource(stream).connect(analyser)
  timeBuf = new Uint8Array(analyser.fftSize)
  raw = []; centroids = []
  freqBuf = new Uint8Array(analyser.frequencyBinCount)
  transcriber.start()
  state.value = 'recording'; seconds.value = 0
  timer = setInterval(() => seconds.value++, 1000)
  sampler = setInterval(() => { // loudness (RMS) every 100 ms
    analyser.getByteTimeDomainData(timeBuf)
    let sum = 0
    for (const v of timeBuf) { const x = (v - 128) / 128; sum += x * x }
    raw.push(Math.sqrt(sum / timeBuf.length))
    analyser.getByteFrequencyData(freqBuf) // spectral centroid, used to spot stretched sounds
    let num = 0, den = 0
    for (let k = 1; k < freqBuf.length; k++) { num += k * freqBuf[k]; den += freqBuf[k] }
    centroids.push(den > 0 ? num / den : 0)
  }, 100)
  draw()
}
function draw() {
  const d = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(d)
  levels.value = levels.value.map((_, i) => Math.max(8, (d[i] / 255) * 100))
  raf = requestAnimationFrame(draw)
}
function cleanup() {
  clearInterval(timer); clearInterval(sampler); cancelAnimationFrame(raf)
  stream?.getTracks().forEach((t) => t.stop())
  ctx?.close()
}

async function stop() {
  state.value = 'processing'
  const text = await transcriber.stop()
  cleanup()
  const r = analyzeRecording({ levels: raw, centroids, transcript: text, phrases: compare.value, pauseMs: ex.value?.id === 'smart-pauses' ? 2500 : 1200 })
  if (!r.ok) {
    state.value = 'idle'; seconds.value = 0
    error.value = 'We could not hear enough speech to give honest feedback. Move closer to the microphone, speak a little louder, and try again.'
    return
  }
  try {
    const id = await addResult({ kind: 'exercise', exerciseId: route.params.id, duration: r.duration, wpm: r.wpm, pauses: r.pauses, repetitions: r.repetitions, prolongations: r.prolongations, score: r.score, measured: true })
    router.push(`/app/results/${id}`)
  } catch (e) {
    state.value = 'idle'
    error.value = 'Your result could not be saved: ' + e.message
  }
}
onBeforeUnmount(() => { cleanup(); transcriber.stop() })
const mmss = computed(() => `${String(Math.floor(seconds.value / 60)).padStart(2, '0')}:${String(seconds.value % 60).padStart(2, '0')}`)
</script>

<template>
  <PageHeader :title="title" :subtitle="t('Read the phrases aloud at a comfortable pace.')" />
  <section v-if="phrases.length" class="panel soft phrases">
    <p v-for="p in phrases" :key="p">{{ p }}</p>
  </section>
  <section class="panel rec">
    <div class="bars" aria-hidden="true"><span v-for="(h, i) in levels" :key="i" :style="{ height: h + '%' }" /></div>
    <p class="time">{{ mmss }}</p>
    <p v-if="state === 'processing'" class="muted" role="status">{{ t('Analyzing your recording...') }}</p>
    <div v-else class="row center">
      <button v-if="state === 'idle'" class="pill" @click="start">{{ t('Start recording') }}</button>
      <button v-else class="pill sun" @click="stop">{{ t('Stop and analyze') }}</button>
    </div>
    <p v-if="error" class="err" role="alert">{{ t(error) }}</p>
    <p v-if="!recognitionSupported" class="muted small">{{ t('This browser cannot transcribe speech, so speech rate and repeated words will not be measured. Pauses still are. Chrome, Edge or Safari work best.') }}</p>
  </section>
  <p class="notice">{{ t('Your recording is analyzed on your device and the browser\'s speech service. StutterCare saves only the scores, never the audio.') }}</p>
</template>

<style scoped>
.phrases { margin-bottom: 20px; font: 700 1.2rem var(--font-display); display: flex; flex-direction: column; gap: 8px; }
.rec { display: flex; flex-direction: column; align-items: center; gap: 22px; padding: 40px 20px; margin-bottom: 20px; }
.bars { display: flex; align-items: center; gap: 5px; height: 120px; }
.bars span { width: 8px; border-radius: 99px; background: var(--brand); transition: height .08s; }
.time { font: 800 2.6rem var(--font-display); }
.center { justify-content: center; }
.err { color: var(--berry); text-align: center; max-width: 440px; }
.small { font-size: .85rem; text-align: center; max-width: 440px; }
</style>
