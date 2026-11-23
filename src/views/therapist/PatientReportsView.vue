<script setup>
import { t } from '../../i18n'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '../../components/PageHeader.vue'
import LineChart from '../../components/LineChart.vue'
import StatCard from '../../components/StatCard.vue'
import { api } from '../../api'
import { fmtDate } from '../../data/mock'

const route = useRoute()
const data = ref(null)
const missing = ref(false)
const p = computed(() => data.value?.patient)
const results = computed(() => data.value?.results ?? [])
const points = computed(() => results.value.slice(-10).map((r) => ({ label: fmtDate(r.date), value: r.score })))
const adherence = computed(() => {
  const since = Date.now() - 7 * 864e5
  return Math.round((new Set(results.value.filter((r) => new Date(r.date) >= since).map((r) => new Date(r.date).toDateString())).size / 7) * 100)
})
onMounted(async () => { try { data.value = await api(`/results/patient/${route.params.id}`) } catch { missing.value = true } })
</script>

<template>
  <div v-if="p">
    <RouterLink to="/app/therapist" class="link">{{ t('All patients') }}</RouterLink>
    <PageHeader :title="p.name" :subtitle="[p.track ? t(p.track) : t('no track'), p.age ? t('age') + ' ' + p.age : ''].filter(Boolean).join(', ')">
      <RouterLink :to="`/app/plans?patient=${route.params.id}`" class="pill">{{ t('Edit training plan') }}</RouterLink>
    </PageHeader>
    <div v-if="results.length" class="grid-3 gap">
      <StatCard :label="t('Latest score')" :value="results.at(-1).score" tone="soft" />
      <StatCard :label="t('Best score')" :value="Math.max(...results.map((r) => r.score))" tone="mint" />
      <StatCard :label="t('Active days (7d)')" :value="adherence + '%'" tone="sun" />
    </div>
    <section v-if="results.length" class="panel"><h3>{{ t('Practice score by session') }}</h3><LineChart :points="points" /></section>
    <p v-else class="empty">{{ t('No sessions recorded yet.') }}</p>
    <p class="notice">{{ t('AI results are practice feedback. Use your clinical judgement before changing a plan.') }}</p>
  </div>
  <p v-else-if="missing" class="empty">{{ t('Patient not found, or not linked to your account.') }}</p>
</template>

<style scoped>
.gap { margin-bottom: 20px; } h3 { margin-bottom: 14px; } .notice { margin-top: 20px; }
</style>
