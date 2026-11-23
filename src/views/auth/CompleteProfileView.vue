<script setup>
import { t } from '../../i18n'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '../../components/AppButton.vue'
import TextField from '../../components/TextField.vue'
import { session, saveProfile, homeFor } from '../../stores/session'

const router = useRouter()
const role = computed(() => session.user?.role ?? 'patient')

// Fields per account type (Patient / Parent / Therapist).
const schema = {
  patient: [
    { key: 'age', label: 'Your age', type: 'number' },
    { key: 'since', label: 'Age when stuttering started (optional)', type: 'number', optional: true }
  ],
  parent: [
    { key: 'childName', label: "Child's name" },
    { key: 'childAge', label: "Child's age", type: 'number' }
  ],
  therapist: [
    { key: 'license', label: 'License number' },
    { key: 'clinic', label: 'Clinic or hospital' }
  ]
}
const fields = computed(() => schema[role.value])
const form = reactive({})
const errors = ref({})
const formError = ref('')
const busy = ref(false)

async function submit() {
  const e = {}
  for (const f of fields.value) if (!f.optional && !String(form[f.key] ?? '').trim()) e[f.key] = 'This field is required.'
  errors.value = e
  if (Object.keys(e).length) return
  busy.value = true; formError.value = ''
  try { await saveProfile({ ...form }); router.push(homeFor(session.user)) } catch (e) { formError.value = e.message } finally { busy.value = false }
}
</script>

<template>
  <form class="screen" novalidate @submit.prevent="submit">
    <h1>{{ t('Almost there') }}</h1>
    <p class="muted intro">{{ t('A few details so we can set up the right practice for you.') }}</p>
    <div class="stack fields">
      <TextField v-for="f in fields" :key="f.key" v-model="form[f.key]" :label="t(f.label)" :type="f.type" :error="errors[f.key]" />
    </div>
    <p v-if="formError" class="err" role="alert">{{ t(formError) }}</p>
    <AppButton type="submit" :disabled="busy">{{ busy ? t('Saving...') : t('Save and continue') }}</AppButton>
  </form>
</template>

<style scoped>
.err { color: var(--berry); margin-bottom: 12px; }
h1 { font-size: 2.3rem; margin-top: 18px; }
.intro { margin: 8px 0 24px; }
.fields { margin-bottom: 22px; }
</style>
