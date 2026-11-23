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
const results = ref([])
const name = ref('')
const loading = ref(true)
const error = ref('')
const recent = computed(() => results.value.slice(-8))
const points = computed(() => recent.value.map((r) => ({ label: fmtDate(r.date), value: r.score })))
const last = computed(() => results.value.filter((r) => r.kind !== 'coach').at(-1))

onMounted(async () => {
  try {
    const id = route.query.child || (await api('/patients'))[0]?.id
    if (id) { const r = await api(`/results/patient/${id}`); results.value = r.results; name.value = r.patient.name }
  } catch (e) { error.value = e.message } finally { loading.value = false }
})
</script>

<template>
  <PageHeader :title="name ? t(`${name}'s progress`) : t('Child progress')" :subtitle="t('Reports shared with you.')" />
  <p v-if="error" class="err" role="alert">{{ t(error) }}</p>
  <div v-if="last" class="grid-3 gap">
    <StatCard :label="t('Speech rate')" :value="last.wpm || '-'" :hint="t('wpm, latest recording')" tone="soft" />
    <StatCard :label="t('Pauses')" :value="last.pauses" :hint="t('latest recording')" tone="sun" />
    <StatCard :label="t('Repetitions')" :value="last.repetitions" :hint="t('latest recording')" tone="mint" />
  </div>
  <section v-if="points.length" class="panel"><h3>{{ t('Practice score') }}</h3><LineChart :points="points" /></section>
  <p v-else-if="!loading" class="empty">{{ t('No sessions yet.') }}</p>
  <p class="notice">{{ t('You only see data for children linked to your account. Scores are practice feedback, not a diagnosis. Ask the therapist if anything worries you.') }}</p>
</template>

<style scoped>
.gap { margin-bottom: 20px; } h3 { margin-bottom: 14px; } .notice { margin-top: 20px; } .err { color: var(--berry); }
</style>
