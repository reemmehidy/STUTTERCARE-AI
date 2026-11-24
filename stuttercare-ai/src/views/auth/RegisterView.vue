<script setup>
import { t } from '../../i18n'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '../../components/AppButton.vue'
import TextField from '../../components/TextField.vue'
import { api } from '../../api'

const router = useRouter()
const roles = [
  { id: 'patient', label: 'I want to practice' },
  { id: 'parent', label: "I'm a parent" },
  { id: 'therapist', label: "I'm a therapist" }
]
const form = reactive({ name: '', email: '', password: '', confirm: '', role: 'patient', consent: false })
const errors = ref({})
const formError = ref('')
const busy = ref(false)

function validate() {
  const e = {}
  if (form.name.trim().length < 2) e.name = 'Enter your full name.'
  if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address.'
  if (form.password.length < 8) e.password = 'Use at least 8 characters.'
  else if (!/[A-Za-z\u0600-\u06FF]/.test(form.password) || !/\d/.test(form.password)) e.password = 'Use letters and at least one number.'
  if (form.confirm !== form.password) e.confirm = 'Passwords do not match.'
  if (!form.consent) e.consent = 'Please accept the privacy policy to continue.'
  errors.value = e
  return Object.keys(e).length === 0
}

async function submit() {
  formError.value = ''
  if (!validate() || busy.value) return
  busy.value = true
  try {
    const res = await api('/auth/register', { method: 'POST', auth: false, body: { name: form.name, email: form.email, password: form.password, role: form.role, consent: form.consent } })
    router.push({ path: '/verify', query: { email: res.email, wait: res.resendIn } })
  } catch (e) {
    if (e.fields) errors.value = { ...e.fields }
    formError.value = e.code === 'EMAIL_EXISTS' ? 'This email is already registered. Please log in.' : e.message
  } finally { busy.value = false }
}
</script>

<template>
  <form class="screen" novalidate @submit.prevent="submit">
    <button type="button" class="back" @click="router.back()">{{ t('Back') }}</button>
    <h1>{{ t('Create your account') }}</h1>
    <div class="roles" role="radiogroup" :aria-label="t('Account type')">
      <button v-for="r in roles" :key="r.id" type="button" role="radio" :aria-checked="form.role === r.id" :class="{ on: form.role === r.id }" @click="form.role = r.id">{{ t(r.label) }}</button>
    </div>
    <div class="stack fields">
      <TextField v-model="form.name" :label="t('Full name')" autocomplete="name" :error="errors.name" />
      <TextField v-model="form.email" :label="t('Email')" type="email" autocomplete="email" :error="errors.email" />
      <TextField v-model="form.password" :label="t('Password')" type="password" autocomplete="new-password" :error="errors.password" />
      <TextField v-model="form.confirm" :label="t('Confirm password')" type="password" autocomplete="new-password" :error="errors.confirm" />
    </div>
    <label class="consent"><input v-model="form.consent" type="checkbox" /> <span>{{ t('I agree to the') }} <RouterLink class="link" to="/privacy" target="_blank">{{ t('Privacy Policy') }}</RouterLink>. {{ t('If this account is for a child, I am their parent or guardian.') }}</span></label>
    <p v-if="errors.consent" class="err" role="alert">{{ t(errors.consent) }}</p>
    <p v-if="formError" class="err" role="alert">{{ t(formError) }}</p>
    <AppButton type="submit" :disabled="busy">{{ busy ? t('Sending code...') : t('Create account') }}</AppButton>
    <p class="muted hint">{{ t('We will email you a 6-digit code to confirm your address.') }}</p>
    <p class="muted foot">{{ t('Have an account?') }} <RouterLink class="link" to="/login">{{ t('Log in') }}</RouterLink></p>
  </form>
</template>

<style scoped>
h1 { font-size: 2.1rem; margin: 6px 0 18px; }
.roles { display: flex; gap: 8px; margin-bottom: 18px; }
.roles button { flex: 1; font: 700 .82rem var(--font-body); padding: 12px 8px; border-radius: var(--radius-md); border: 2px solid var(--line); background: #fff; color: var(--ink); cursor: pointer; }
.roles button.on { background: var(--brand); border-color: var(--brand); color: #fff; }
.fields { margin-bottom: 18px; }
.err { color: var(--berry); margin-bottom: 12px; }
.consent { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 14px; font-size: .9rem; line-height: 1.5; }
.consent input { margin-top: 4px; width: 18px; height: 18px; accent-color: var(--brand); }
.hint { text-align: center; font-size: .85rem; margin-top: 10px; }
.foot { text-align: center; margin-top: 12px; }
</style>
