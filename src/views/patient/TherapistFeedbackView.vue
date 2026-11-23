<script setup>
import { onMounted, ref } from 'vue'
import { t } from '../../i18n'
import PageHeader from '../../components/PageHeader.vue'
import { session } from '../../stores/session'
import { api } from '../../api'
import { fmtDate } from '../../data/mock'

const code = ref('')
const copied = ref(false)
const error = ref('')

async function loadCode() {
  try { const r = await api('/patients/me/link-code'); code.value = r.code; session.user.hasTherapist = r.hasTherapist; session.user.hasParent = r.hasParent } catch (e) { error.value = e.message }
}
async function resetCode() {
  if (!confirm(t('Create a new code? The old one will stop working.'))) return
  try { code.value = (await api('/patients/me/link-code/reset', { method: 'POST' })).code } catch (e) { error.value = e.message }
}
async function unlink(who) {
  if (!confirm(t('Remove this link? They will no longer see your progress.'))) return
  try { await api(`/patients/me/link/${who}`, { method: 'DELETE' }); await loadCode() } catch (e) { error.value = e.message }
}
async function copy() {
  try { await navigator.clipboard.writeText(code.value); copied.value = true; setTimeout(() => (copied.value = false), 1500) } catch { /* ignore */ }
}
onMounted(loadCode)
</script>

<template>
  <PageHeader :title="t('Therapist feedback')" :subtitle="t('Notes and recommendations from your speech therapist.')" />
  <section class="panel soft linkbox">
    <h3>{{ t('Your link code') }}</h3>
    <p class="muted">{{ t('Give this code to your speech therapist or parent so they can follow your progress. Only people you give it to can link.') }}</p>
    <div class="row">
      <strong class="code" dir="ltr">{{ code || '········' }}</strong>
      <button class="pill small" :disabled="!code" @click="copy">{{ copied ? t('Copied') : t('Copy') }}</button>
      <button class="pill ghost small" @click="resetCode">{{ t('New code') }}</button>
    </div>
    <div class="row links">
      <span v-if="session.user?.hasTherapist" class="tag good">{{ t('Therapist linked') }} <button class="x" @click="unlink('therapist')">{{ t('Remove') }}</button></span>
      <span v-if="session.user?.hasParent" class="tag good">{{ t('Parent linked') }} <button class="x" @click="unlink('parent')">{{ t('Remove') }}</button></span>
    </div>
    <p v-if="error" class="bad" role="alert">{{ t(error) }}</p>
  </section>
  <div class="stack">
    <article v-for="f in session.feedback" :key="f.id" class="panel">
      <div class="row between"><strong>{{ f.from }}</strong><span class="muted">{{ fmtDate(f.date) }}</span></div>
      <p>{{ f.text }}</p>
    </article>
    <p v-if="!session.feedback.length" class="empty">{{ t("No notes yet. Your therapist's notes will show up here.") }}</p>
  </div>
</template>

<style scoped>
.linkbox { margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; }
.code { font: 800 2rem monospace; letter-spacing: 6px; background: #fff; border-radius: 14px; padding: 8px 18px; border: 2px dashed var(--brand); }
.links { gap: 8px; flex-wrap: wrap; }
.x { background: none; border: 0; text-decoration: underline; cursor: pointer; font: inherit; color: var(--berry); }
.bad { color: var(--berry); }
</style>
