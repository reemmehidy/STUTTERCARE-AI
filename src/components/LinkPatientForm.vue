<script setup>
import { ref } from 'vue'
import { t } from '../i18n'
import { api } from '../api'

const emit = defineEmits(['linked'])
const code = ref('')
const busy = ref(false)
const msg = ref('')
const bad = ref(false)

async function link() {
  msg.value = ''; busy.value = true
  try {
    const r = await api('/patients/link', { method: 'POST', body: { code: code.value } })
    bad.value = false; msg.value = `${t('Linked with')} ${r.patient.name}.`; code.value = ''
    emit('linked')
  } catch (e) { bad.value = true; msg.value = e.message } finally { busy.value = false }
}
</script>

<template>
  <section class="panel soft box">
    <h3>{{ t('Link a patient with their code') }}</h3>
    <p class="muted">{{ t('Ask the patient to open "Therapist feedback" in their account and read you their 8-character code.') }}</p>
    <div class="row">
      <input v-model="code" maxlength="9" autocomplete="off" placeholder="ABCD2345" :aria-label="t('Link code')" @keyup.enter="link" />
      <button class="pill" :disabled="busy || code.trim().length < 8" @click="link">{{ busy ? t('Linking...') : t('Link') }}</button>
    </div>
    <p v-if="msg" :class="bad ? 'bad' : 'good'" role="status">{{ t(msg) }}</p>
  </section>
</template>

<style scoped>
.box { margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; }
input { flex: 1; min-width: 180px; font: 700 1.1rem monospace; letter-spacing: 3px; text-transform: uppercase; padding: 12px 14px; border-radius: 14px; border: 2px solid var(--line); }
.bad { color: var(--berry); } .good { color: #1c7a53; font-weight: 700; }
</style>
