<script setup>
import { t } from '../../i18n'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '../../components/AppButton.vue'
import TextField from '../../components/TextField.vue'
import { api } from '../../api'
import { completeAuth, homeFor } from '../../stores/session'

const router = useRouter()
const route = useRoute()
const form = reactive({ email: '', password: '' })
const errors = ref({})
const formError = ref('')
const busy = ref(false)

async function submit() {
  formError.value = ''
  const e = {}
  if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address.'
  if (!form.password) e.password = 'Enter your password.'
  errors.value = e
  if (Object.keys(e).length || busy.value) return
  busy.value = true
  try {
    const res = await api('/auth/login', { method: 'POST', auth: false, body: { email: form.email, password: form.password } })
    await completeAuth(res)
    router.push(res.user.role === 'patient' && !res.user.track ? '/track' : homeFor(res.user))
  } catch (err) {
    if (err.code === 'EMAIL_NOT_VERIFIED') return router.push({ path: '/verify', query: { email: err.data.email, wait: err.data.resendIn } })
    formError.value = err.message
  } finally { busy.value = false }
}
</script>

<template>
  <form class="screen" novalidate @submit.prevent="submit">
    <button type="button" class="back" @click="router.push('/welcome')">{{ t('Back') }}</button>
    <h1>{{ t('Welcome back') }}</h1>
    <p class="muted intro">{{ t('Log in to continue today\'s practice.') }}</p>
    <p v-if="route.query.reset" class="ok" role="status">{{ t('Password updated. Please log in.') }}</p>
    <div class="stack fields">
      <TextField v-model="form.email" :label="t('Email')" type="email" autocomplete="email" :error="errors.email" />
      <TextField v-model="form.password" :label="t('Password')" type="password" autocomplete="current-password" :error="errors.password" />
    </div>
    <p v-if="formError" class="err" role="alert">{{ t(formError) }}</p>
    <AppButton type="submit" :disabled="busy">{{ busy ? t('Logging in...') : t('Log in') }}</AppButton>
    <p class="muted foot"><RouterLink class="link" to="/forgot">{{ t('Forgot your password?') }}</RouterLink></p>
    <p class="muted foot">{{ t('New here?') }} <RouterLink class="link" to="/register">{{ t('Create an account') }}</RouterLink></p>
  </form>
</template>

<style scoped>
h1 { font-size: 2.4rem; margin: 6px 0 8px; }
.intro { margin-bottom: 20px; }
.fields { margin-bottom: 18px; }
.err { color: var(--berry); margin-bottom: 12px; }
.ok { color: #1c7a53; margin-bottom: 12px; }
.foot { text-align: center; margin-top: 14px; }
</style>
