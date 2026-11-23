<script setup>
import { t } from '../../i18n'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '../../components/AppButton.vue'
import TextField from '../../components/TextField.vue'
import { api } from '../../api'

const router = useRouter()
const step = ref(1)
const form = reactive({ email: '', otp: '', password: '', confirm: '' })
const errors = ref({})
const formError = ref('')
const info = ref('')
const busy = ref(false)

async function sendCode() {
  formError.value = ''; errors.value = {}
  if (!/^\S+@\S+\.\S+$/.test(form.email)) return (errors.value = { email: 'Enter a valid email address.' })
  busy.value = true
  try {
    await api('/auth/forgot-password', { method: 'POST', auth: false, body: { email: form.email } })
    step.value = 2
    info.value = 'If that email is registered, we sent a 6-digit code.'
  } catch (e) { formError.value = e.message } finally { busy.value = false }
}

async function reset() {
  formError.value = ''
  const e = {}
  if (!/^\d{6}$/.test(form.otp)) e.otp = 'Enter the 6-digit code.'
  if (form.password.length < 8 || !/\d/.test(form.password) || !/[A-Za-z\u0600-\u06FF]/.test(form.password)) e.password = 'Use 8+ characters with letters and a number.'
  if (form.confirm !== form.password) e.confirm = 'Passwords do not match.'
  errors.value = e
  if (Object.keys(e).length) return
  busy.value = true
  try {
    await api('/auth/reset-password', { method: 'POST', auth: false, body: { email: form.email, otp: form.otp, newPassword: form.password } })
    router.replace({ path: '/login', query: { reset: '1' } })
  } catch (err) {
    if (err.fields) errors.value = { password: err.fields.newPassword }
    formError.value = err.message
  } finally { busy.value = false }
}
</script>

<template>
  <form class="screen" novalidate @submit.prevent="step === 1 ? sendCode() : reset()">
    <button type="button" class="back" @click="router.push('/login')">{{ t('Back to log in') }}</button>
    <h1>{{ t('Reset your password') }}</h1>
    <template v-if="step === 1">
      <p class="muted intro">{{ t('Enter your email and we will send you a code.') }}</p>
      <div class="stack fields"><TextField v-model="form.email" :label="t('Email')" type="email" autocomplete="email" :error="errors.email" /></div>
      <p v-if="formError" class="err" role="alert">{{ t(formError) }}</p>
      <AppButton type="submit" :disabled="busy">{{ busy ? t('Sending...') : t('Send code') }}</AppButton>
    </template>
    <template v-else>
      <p class="muted intro">{{ t(info) }}</p>
      <div class="stack fields">
        <TextField v-model="form.otp" :label="t('6-digit code')" inputmode="numeric" maxlength="6" autocomplete="one-time-code" :error="errors.otp" />
        <TextField v-model="form.password" :label="t('New password')" type="password" autocomplete="new-password" :error="errors.password" />
        <TextField v-model="form.confirm" :label="t('Confirm new password')" type="password" autocomplete="new-password" :error="errors.confirm" />
      </div>
      <p v-if="formError" class="err" role="alert">{{ t(formError) }}</p>
      <AppButton type="submit" :disabled="busy">{{ busy ? t('Saving...') : t('Update password') }}</AppButton>
      <p class="muted foot">{{ t('No code?') }} <button type="button" class="linkbtn" @click="step = 1">{{ t('Send it again') }}</button></p>
    </template>
  </form>
</template>

<style scoped>
h1 { font-size: 2.1rem; margin: 6px 0 8px; }
.intro { margin-bottom: 20px; }
.fields { margin-bottom: 18px; }
.err { color: var(--berry); margin-bottom: 12px; }
.foot { text-align: center; margin-top: 14px; }
.linkbtn { background: none; border: 0; color: var(--brand); font: inherit; font-weight: 700; cursor: pointer; padding: 0; }
</style>
