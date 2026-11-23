<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { t, lang, speechLang } from '../../i18n'
import PageHeader from '../../components/PageHeader.vue'
import { session } from '../../stores/session'
import { speak } from '../../utils/speech'
import { WORDS } from '../../utils/coachLogic'

const video = ref(null)
const on = ref(false)
const error = ref('')
const i = ref(0)
let stream
const list = computed(() => WORDS[lang.value][session.track === 'kids' ? 'kids' : 'adults'])
const word = computed(() => list.value[i.value % list.value.length])
const tips = ['Relax your forehead and jaw.', 'Open your mouth a little more than usual.', 'Say the word slowly and smile softly.', 'Notice any tight lips or tongue, and relax them.']

async function start() {
  error.value = ''
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    on.value = true
    await new Promise((r) => setTimeout(r)) // wait for the <video> to render
    video.value.srcObject = stream
  } catch { error.value = 'Camera access is blocked. Allow the camera in your browser settings and try again.' }
}
function stop() { stream?.getTracks().forEach((x) => x.stop()); on.value = false }
const next = () => { i.value = (i.value + 1) % list.value.length }
const hear = () => speak(word.value, { lang: speechLang, rate: 0.6 })
onBeforeUnmount(stop)
</script>

<template>
  <PageHeader :title="t('Mirror practice')" :subtitle="t('Watch your face while you say each word slowly. Great for relaxing your mouth and jaw.')" />
  <section class="panel mirror">
    <div v-if="on" class="screen"><video ref="video" autoplay playsinline muted /></div>
    <div v-else class="screen off"><p>{{ t('Turn the camera on to see yourself.') }}</p></div>
    <div class="word">{{ word }}</div>
    <div class="row center">
      <button v-if="!on" class="pill sun" @click="start">{{ t('Turn camera on') }}</button>
      <button v-else class="pill ghost" @click="stop">{{ t('Turn camera off') }}</button>
      <button class="pill" @click="hear">{{ t('Hear the word') }}</button>
      <button class="pill ghost" @click="next">{{ t('Next word') }}</button>
    </div>
    <p v-if="error" class="err" role="alert">{{ t(error) }}</p>
    <ul><li v-for="x in tips" :key="x">{{ t(x) }}</li></ul>
  </section>
  <p class="notice">{{ t('Your camera video stays on your device. It is never recorded or uploaded.') }}</p>
</template>

<style scoped>
.mirror { display: flex; flex-direction: column; align-items: center; gap: 16px; margin-bottom: 20px; }
.screen { width: 100%; max-width: 420px; aspect-ratio: 4 / 3; border-radius: 24px; overflow: hidden; background: var(--lav-soft); display: grid; place-items: center; }
.screen video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
.off p { color: #5d5580; padding: 20px; text-align: center; }
.word { font: 800 clamp(2rem, 7vw, 3rem) var(--font-display); color: var(--brand-deep); }
.center { justify-content: center; flex-wrap: wrap; gap: 10px; }
.err { color: var(--berry); }
ul { align-self: stretch; padding-inline-start: 22px; line-height: 1.9; }
</style>
