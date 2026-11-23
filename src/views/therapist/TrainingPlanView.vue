<script setup>
import { t } from '../../i18n'
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '../../components/PageHeader.vue'
import { api } from '../../api'
import { DAYS, exercises, defaultPlan } from '../../data/mock'

const route = useRoute()
const router = useRouter()
const patients = ref([])
const pid = ref(route.query.patient || '')
const plan = reactive({})
const note = ref('')
const saved = ref(false)
const error = ref('')

async function load() {
  saved.value = false; error.value = ''
  if (!pid.value) return
  try {
    const r = await api(`/plans/patient/${pid.value}`)
    for (const k of Object.keys(plan)) delete plan[k]
    Object.assign(plan, JSON.parse(JSON.stringify(r.plan ?? defaultPlan())))
    note.value = r.note ?? ''
  } catch (e) { error.value = e.message }
}
onMounted(async () => {
  try { patients.value = await api('/patients') } catch (e) { error.value = e.message }
  if (!pid.value && patients.value[0]) pid.value = patients.value[0].id
  load()
})
watch(pid, () => { router.replace({ query: { patient: pid.value } }); load() })

function toggle(day, id) {
  const l = plan[day] ?? (plan[day] = [])
  const i = l.indexOf(id)
  i === -1 ? l.push(id) : l.splice(i, 1)
  saved.value = false
}
async function save() {
  error.value = ''
  try { await api(`/plans/patient/${pid.value}`, { method: 'PUT', body: { plan: JSON.parse(JSON.stringify(plan)), note: note.value } }); saved.value = true } catch (e) { error.value = e.message }
}
</script>

<template>
  <PageHeader :title="t('Training plan')" :subtitle="t('Choose weekly exercises and write recommendations. The patient sees them right away.')" />
  <p v-if="!patients.length" class="empty">{{ t('No linked patients yet.') }}</p>
  <template v-else>
    <label class="sel"><span>{{ t('Patient') }}</span>
      <select v-model="pid"><option v-for="p in patients" :key="p.id" :value="p.id">{{ p.name }} ({{ p.track }})</option></select>
    </label>
    <section class="panel table-wrap">
      <table class="table">
        <thead><tr><th>{{ t('Day') }}</th><th v-for="e in exercises" :key="e.id">{{ e.title }}</th></tr></thead>
        <tbody>
          <tr v-for="d in DAYS" :key="d">
            <th>{{ t(d) }}</th>
            <td v-for="e in exercises" :key="e.id"><input type="checkbox" :checked="plan[d]?.includes(e.id)" :aria-label="`${e.title} - ${t(d)}`" @change="toggle(d, e.id)" /></td>
          </tr>
        </tbody>
      </table>
    </section>
    <label class="note"><span>{{ t('Notes and recommendations (sent to the patient)') }}</span><textarea v-model="note" rows="4" maxlength="1000" :placeholder="t('What should this patient focus on this week?')" @input="saved = false" /></label>
    <p v-if="error" class="err" role="alert">{{ t(error) }}</p>
    <div class="row"><button class="pill" @click="save">{{ t('Save plan') }}</button><span v-if="saved" class="tag good" role="status">{{ t('Plan saved') }}</span></div>
  </template>
</template>

<style scoped>
.sel, .note { display: flex; flex-direction: column; gap: 6px; font-weight: 700; margin-bottom: 20px; max-width: 520px; }
.note { max-width: none; margin-top: 20px; }
select, textarea { font: inherit; padding: 12px 14px; border-radius: 14px; border: 2px solid var(--line); background: #fff; }
td { text-align: center; }
input[type='checkbox'] { width: 20px; height: 20px; accent-color: var(--brand); }
.err { color: var(--berry); margin-bottom: 10px; }
</style>
