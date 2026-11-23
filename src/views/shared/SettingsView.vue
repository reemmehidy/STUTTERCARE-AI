<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { t, lang, setLang } from '../../i18n'
import PageHeader from '../../components/PageHeader.vue'
import { session, saveProfile, signOut } from '../../stores/session'
import { api } from '../../api'

const router = useRouter()
const nick = ref(session.user?.profile?.nickname ?? '')
const msg = ref('')
const bad = ref(false)
const pw = ref('')
const busy = ref(false)

async function saveNick() {
  msg.value = ''
  try { await saveProfile({ nickname: nick.value.trim() }); bad.value = false; msg.value = 'Saved' } catch (e) { bad.value = true; msg.value = e.message }
}
async function remove() {
  if (!confirm(t('Delete your account and all your data? This cannot be undone.'))) return
  busy.value = true; msg.value = ''
  try {
    await api('/auth/me', { method: 'DELETE', body: { password: pw.value } })
    await signOut(); router.push('/welcome')
  } catch (e) { bad.value = true; msg.value = e.message } finally { busy.value = false }
}
</script>

<template>
  <PageHeader :title="t('Settings')" :subtitle="session.user?.email" />
  <section class="panel box">
    <h3>{{ t('Language') }}</h3>
    <div class="row"><button :class="['pill small', { ghost: lang !== 'ar' }]" @click="setLang('ar')">العربية</button><button :class="['pill small', { ghost: lang !== 'en' }]" @click="setLang('en')">English</button></div>
  </section>
  <section v-if="session.user?.role === 'patient'" class="panel box">
    <h3>{{ t('Nickname') }}</h3>
    <p class="muted">{{ t('This is what Arkan calls you.') }}</p>
    <div class="row"><input v-model="nick" maxlength="30" :aria-label="t('Nickname')" /><button class="pill small" @click="saveNick">{{ t('Save') }}</button></div>
  </section>
  <section class="panel box">
    <h3>{{ t('Privacy') }}</h3>
    <RouterLink to="/privacy" class="link">{{ t('Privacy Policy') }}</RouterLink>
  </section>
  <section v-if="session.user?.role !== 'admin'" class="panel box danger">
    <h3>{{ t('Delete account') }}</h3>
    <p class="muted">{{ t('This removes your account, results, plans and notes for good.') }}</p>
    <div class="row"><input v-model="pw" type="password" autocomplete="current-password" :placeholder="t('Your password')" :aria-label="t('Your password')" /><button class="pill small warn" :disabled="busy || !pw" @click="remove">{{ t('Delete my account') }}</button></div>
  </section>
  <p v-if="msg" :class="bad ? 'bad' : 'good'" role="status">{{ t(msg) }}</p>
</template>

<style scoped>
.box { margin-bottom: 16px; display: flex; flex-direction: column; gap: 10px; }
.danger { border: 2px solid var(--berry); }
input { flex: 1; min-width: 200px; font: inherit; padding: 10px 14px; border-radius: 14px; border: 2px solid var(--line); }
.warn { background: var(--berry); color: #fff; }
.bad { color: var(--berry); } .good { color: #1c7a53; font-weight: 700; }
</style>
