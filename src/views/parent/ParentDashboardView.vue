<script setup>
import { t } from '../../i18n'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import StatCard from '../../components/StatCard.vue'
import LinkPatientForm from '../../components/LinkPatientForm.vue'
import { api } from '../../api'
import { fmtDate, exerciseTitle, todayName } from '../../data/mock'

const children = ref([])
const selected = ref('')
const results = ref([])
const planned = ref(0)
const loading = ref(true)
const error = ref('')
const child = computed(() => children.value.find((c) => c.id === selected.value) ?? children.value[0])
const last = computed(() => results.value.at(-1))

const form = reactive({ name: '', age: '', email: '', password: '' })
const errors = ref({})
const formMsg = ref('')
const adding = ref(false)
const therapistEmail = ref('')
const linkMsg = reactive({ text: '', bad: false })

async function loadChildren() {
  children.value = await api('/patients')
  if (!selected.value && children.value[0]) selected.value = children.value[0].id
}
async function loadChild() {
  if (!child.value) return
  const [r, p] = await Promise.all([api(`/results/patient/${child.value.id}`), api(`/plans/patient/${child.value.id}`)])
  results.value = r.results
  planned.value = (p.plan?.[todayName()] ?? []).length
}
onMounted(async () => {
  try { await loadChildren(); await loadChild() } catch (e) { error.value = e.message } finally { loading.value = false }
})
async function reload() { await loadChildren(); await loadChild() }
watch(selected, () => loadChild().catch((e) => (error.value = e.message)))

async function addChild() {
  errors.value = {}; formMsg.value = ''; adding.value = true
  try {
    await api('/patients', { method: 'POST', body: { name: form.name, age: form.age, email: form.email, password: form.password } })
    Object.assign(form, { name: '', age: '', email: '', password: '' })
    await loadChildren(); await loadChild()
  } catch (e) { errors.value = e.fields ?? {}; formMsg.value = e.message } finally { adding.value = false }
}
async function linkTherapist() {
  linkMsg.text = ''
  try {
    const r = await api(`/patients/${child.value.id}/therapist`, { method: 'PUT', body: { therapistEmail: therapistEmail.value } })
    Object.assign(linkMsg, { text: `Linked with ${r.therapist.name}.`, bad: false })
    await loadChildren()
  } catch (e) { Object.assign(linkMsg, { text: e.message, bad: true }) }
}
</script>

<template>
  <PageHeader :title="child ? t(`${child.name}'s dashboard`) : t('Your children')" :subtitle="t('The children linked to your account.')">
    <RouterLink v-if="child" :to="`/app/child?child=${child.id}`" class="pill">{{ t('See progress') }}</RouterLink>
  </PageHeader>
  <p v-if="error" class="err" role="alert">{{ t(error) }}</p>

  <template v-if="child">
    <label v-if="children.length > 1" class="sel"><span>{{ t('Child') }}</span><select v-model="selected"><option v-for="c in children" :key="c.id" :value="c.id">{{ c.name }}</option></select></label>
    <div class="grid-3 gap">
      <StatCard :label="t('Planned today')" :value="planned" :hint="t('exercises')" tone="soft" />
      <StatCard :label="t('Stars')" :value="child.stars" :hint="t('earned so far')" tone="sun" />
      <StatCard :label="t('Latest score')" :value="last?.score ?? '-'" :hint="last ? fmtDate(last.date) : t('No sessions')" tone="mint" />
    </div>
    <section class="panel gap">
      <h3>{{ t('Recent activity') }}</h3>
      <p v-if="!results.length" class="muted">{{ t('No practice yet.') }}</p>
      <div v-for="r in [...results].reverse().slice(0, 5)" :key="r.id" class="row between item">
        <span>{{ exerciseTitle(r.exerciseId) }}<span v-if="r.word"> · {{ r.word }}</span></span><span class="muted">{{ fmtDate(r.date) }} {{ t('· score') }} {{ r.score }}</span>
      </div>
    </section>
    <section v-if="!child.therapist" class="panel soft gap">
      <h3>{{ t('Link a speech therapist') }}</h3>
      <div class="row"><input v-model="therapistEmail" type="email" :placeholder="t('therapist@clinic.com')" :aria-label="t('Therapist email')" /><button class="pill" :disabled="!therapistEmail" @click="linkTherapist">{{ t('Link') }}</button></div>
      <p v-if="linkMsg.text" :class="linkMsg.bad ? 'err' : 'ok'" role="status">{{ t(linkMsg.text) }}</p>
    </section>
    <p v-else class="muted gap">{{ t('Therapist:') }} <strong>{{ child.therapist.name }}</strong></p>
  </template>
  <p v-else-if="!loading" class="empty">{{ t('Add your child below to start.') }}</p>

  <LinkPatientForm @linked="reload" />
  <section class="panel">
    <h3>{{ t('Add a child') }}</h3>
    <p class="muted">{{ t('Create a practice account for your child. They log in with this email and password.') }}</p>
    <form class="grid-2 add" novalidate @submit.prevent="addChild">
      <label>{{ t('Name') }}<input v-model="form.name" autocomplete="off" /><small v-if="errors.name" class="err">{{ t(errors.name) }}</small></label>
      <label>{{ t('Age') }}<input v-model="form.age" type="number" min="1" max="18" /></label>
      <label>{{ t('Email') }}<input v-model="form.email" type="email" autocomplete="off" /><small v-if="errors.email" class="err">{{ t(errors.email) }}</small></label>
      <label>{{ t('Password') }}<input v-model="form.password" type="password" autocomplete="new-password" /><small v-if="errors.password" class="err">{{ t(errors.password) }}</small></label>
      <div><button class="pill" type="submit" :disabled="adding">{{ adding ? t('Adding...') : t('Add child') }}</button></div>
    </form>
    <p v-if="formMsg" class="err" role="alert">{{ t(formMsg) }}</p>
  </section>
</template>

<style scoped>
.gap { margin-bottom: 20px; } h3 { margin-bottom: 8px; } .item { padding: 12px 0; border-bottom: 1px solid var(--line); }
.err { color: var(--berry); } .ok { color: #1c7a53; font-weight: 700; }
.sel, .add label { display: flex; flex-direction: column; gap: 6px; font-weight: 700; margin-bottom: 14px; max-width: 360px; }
input, select { font: inherit; padding: 12px 14px; border-radius: 14px; border: 2px solid var(--line); background: #fff; }
.row input { flex: 1; min-width: 220px; }
</style>
