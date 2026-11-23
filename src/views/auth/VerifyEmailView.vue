<script setup>
import { t } from '../../i18n'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../../api'
import { completeAuth } from '../../stores/session'

const route = useRoute()
const router = useRouter()
const email = String(route.query.email || '')
const digits = ref(Array(6).fill(''))
const boxes = ref([])
const error = ref('')
const info = ref('')
const busy = ref(false)
const wait = ref(Math.max(0, Number(route.query.wait) || 60))
let timer

const masked = computed(() => email.replace(/^(.).*(@.*)$/, '$1***$2'))
const code = computed(() => digits.value.join(''))

onMounted(() => {
  if (!email) return router.replace('/register')
  timer = setInterval(() => { if (wait.value > 0) wait.value-- }, 1000)
  boxes.value[0]?.focus()
})
onBeforeUnmount(() => clearInterval(timer))

function fill(text) {
  const d = text.replace(/\D/g, '').slice(0, 6).split('')
  digits.value = Array.from({ length: 6 }, (_, i) => d[i] ?? '')
  const next = Math.min(d.length, 5)
  nextTick(() => boxes.value[next]?.focus())
  if (d.length === 6) submit()
}
function onInput(i, e) {
  const v = e.target.value.replace(/\D/g, '')
  if (v.length > 1) return fill(v) // autofill from email/SMS puts all digits in one box
  digits.value[i] = v
  if (v && i < 5) boxes.value[i + 1]?.focus()
  if (code.value.length === 6) submit()
}
function onKey(i, e) {
  if (e.key === 'Backspace' && !digits.value[i] && i > 0) boxes.value[i - 1]?.focus()
  if (e.key === 'ArrowLeft' && i > 0) boxes.value[i - 1]?.focus()
  if (e.key === 'ArrowRight' && i < 5) boxes.value[i + 1]?.focus()
}
const onPaste = (e) => { e.preventDefault(); fill(e.clipboardData.getData('text')) }

async function submit() {
  if (busy.value || code.value.length !== 6) return
  busy.value = true; error.value = ''; info.value = ''
  try {
    const res = await api('/auth/verify-email', { method: 'POST', auth: false, body: { email, otp: code.value } })
    await completeAuth(res)
    router.replace(res.user.role === 'patient' ? '/track' : '/profile')
  } catch (e) {
    error.value = e.message
    digits.value = Array(6).fill('')
    nextTick(() => boxes.value[0]?.focus())
  } finally { busy.value = false }
}

async function resend() {
  if (wait.value > 0) return
  error.value = ''; info.value = ''
  try {
    const res = await api('/auth/resend-otp', { method: 'POST', auth: false, body: { email } })
    wait.value = res.resendIn
    info.value = 'A new code is on its way. Check your inbox and spam folder.'
  } catch (e) { error.value = e.message }
}
</script>

<template>
  <section class="screen">
    <button type="button" class="back" @click="router.push('/register')">{{ t('Back') }}</button>
    <h1>{{ t('Check your email') }}</h1>
    <p class="muted intro">{{ t('We sent a 6-digit code to') }} <strong>{{ masked }}</strong>{{ t('. It expires in 10 minutes.') }}</p>
    <div class="otp" role="group" :aria-label="t('6-digit verification code')" @paste="onPaste">
      <input v-for="(d, i) in digits" :key="i" :ref="(el) => (boxes[i] = el)" :value="d" :class="{ filled: d }" inputmode="numeric" pattern="[0-9]*" maxlength="6" :autocomplete="i === 0 ? 'one-time-code' : 'off'" :aria-label="`${t('Digit')} ${i + 1}`" :disabled="busy" @input="onInput(i, $event)" @keydown="onKey(i, $event)" @focus="$event.target.select()" />
    </div>
    <p v-if="error" class="err" role="alert">{{ t(error) }}</p>
    <p v-if="info" class="ok" role="status">{{ t(info) }}</p>
    <button class="pill" :disabled="busy || code.length !== 6" @click="submit">{{ busy ? t('Checking...') : t('Verify and continue') }}</button>
    <p class="muted foot">
      {{ t('Did not get it?') }}
      <button v-if="wait <= 0" class="linkbtn" @click="resend">{{ t('Send a new code') }}</button>
      <span v-else>{{ t('Resend in') }} {{ wait }}{{ t('s') }}</span>
    </p>
  </section>
</template>

<style scoped>
h1 { font-size: 2.2rem; margin: 6px 0 8px; }
.intro { margin-bottom: 24px; }
.otp { display: flex; gap: 8px; justify-content: center; margin-bottom: 18px; }
.otp input { width: 100%; max-width: 54px; aspect-ratio: 1 / 1.2; text-align: center; font: 700 1.6rem var(--font-display); border: 2px solid var(--line); border-radius: var(--radius-md); background: #fff; color: var(--ink); padding: 0; }
.otp input:focus { border-color: var(--brand); outline: none; }
.otp input.filled { border-color: var(--brand); background: var(--lav-soft); }
.err { color: var(--berry); text-align: center; margin-bottom: 12px; }
.ok { color: #1c7a53; text-align: center; margin-bottom: 12px; }
.pill { width: 100%; }
.pill:disabled { opacity: .5; cursor: not-allowed; }
.foot { text-align: center; margin-top: 16px; }
.linkbtn { background: none; border: 0; color: var(--brand); font: inherit; font-weight: 700; cursor: pointer; padding: 0; }
</style>
