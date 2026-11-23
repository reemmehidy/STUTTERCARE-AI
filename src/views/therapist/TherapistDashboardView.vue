<script setup>
import { t } from '../../i18n'
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { api } from '../../api'
import LinkPatientForm from '../../components/LinkPatientForm.vue'

const patients = ref([])
const loading = ref(true)
const error = ref('')
const trend = (s) => (s.length < 2 ? 'New' : s.at(-1) - s[0] >= 5 ? 'Improving' : s.at(-1) - s[0] <= -2 ? 'Declining' : 'Steady')

async function load() {
  try { patients.value = await api('/patients') } catch (e) { error.value = e.message } finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <PageHeader :title="t('My patients')" :subtitle="t('Only patients linked to your account are listed.')" />
  <p v-if="error" class="err" role="alert">{{ t(error) }}</p>
  <section v-if="patients.length" class="panel table-wrap gap">
    <table class="table">
      <thead><tr><th>{{ t('Patient') }}</th><th>{{ t('Track') }}</th><th>{{ t('Sessions') }}</th><th>{{ t('Adherence (7 days)') }}</th><th>{{ t('Latest score') }}</th><th>{{ t('Trend') }}</th><th /></tr></thead>
      <tbody>
        <tr v-for="p in patients" :key="p.id">
          <td><strong>{{ p.name }}</strong></td><td>{{ t(p.track) }}</td><td>{{ p.sessions }}</td><td>{{ p.adherence }}%</td><td>{{ p.scores.at(-1) ?? '-' }}</td>
          <td><span :class="['tag', { good: trend(p.scores) === 'Improving', warn: trend(p.scores) === 'Declining' }]">{{ t(trend(p.scores)) }}</span></td>
          <td><RouterLink :to="`/app/patients/${p.id}`" class="link">{{ t('Open') }}</RouterLink></td>
        </tr>
      </tbody>
    </table>
  </section>
  <p v-else-if="!loading" class="empty">{{ t('No patients yet.') }}</p>
  <LinkPatientForm @linked="load" />
</template>

<style scoped>
.gap { margin-bottom: 20px; } h3 { margin-bottom: 8px; } .err { color: var(--berry); }
</style>
