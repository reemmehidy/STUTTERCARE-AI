<script setup>
import { t } from '../../i18n'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '../../components/PageHeader.vue'
import ScoreRing from '../../components/ScoreRing.vue'
import StatCard from '../../components/StatCard.vue'
import { session } from '../../stores/session'
import { exerciseTitle } from '../../data/mock'

const route = useRoute()
const r = computed(() => session.results.find((x) => x.id === route.params.id))
const tips = computed(() => {
  if (!r.value) return []
  const out = []
  if (r.value.pauses > 4) out.push('Several long pauses were found. Try smart pauses between short phrases.')
  if (r.value.repetitions > 2) out.push('Some repeated sounds were found. Start the first sound softly with easy onset.')
  if (r.value.prolongations > 2) out.push('Some sounds were held for a long time. Practice gliding smoothly into the next sound.')
  if (r.value.wpm > 135) out.push('Your pace was quick. Slow down a little to keep control.')
  return out.length ? out : ['Smooth session. Keep the same calm pace tomorrow.']
})
</script>

<template>
  <div v-if="r">
    <PageHeader :title="exerciseTitle(r.exerciseId)" :subtitle="t('Your practice feedback')">
      <RouterLink :to="`/app/record/${r.exerciseId}`" class="pill ghost">{{ t('Try again') }}</RouterLink>
      <RouterLink to="/app/progress" class="pill">{{ t('See progress') }}</RouterLink>
    </PageHeader>
    <div class="top">
      <section class="panel ring"><ScoreRing :value="r.score" /><p class="muted">{{ t('Fluency practice score') }}</p></section>
      <div class="grid-3 stats">
        <StatCard :label="t('Speech rate')" :value="r.wpm || '-'" :hint="r.wpm ? t('words per minute') : t('needs speech recognition')" tone="soft" />
        <StatCard :label="t('Pauses')" :value="r.pauses" :hint="t('long gaps found')" tone="sun" />
        <StatCard :label="t('Stretched sounds')" :value="r.prolongations ?? 0" :hint="t('possible, estimated from audio')" tone="soft" />
        <StatCard :label="t('Repetitions')" :value="r.repetitions" :hint="t('repeated sounds or words')" tone="mint" />
      </div>
    </div>
    <section class="panel"><h3>{{ t('What to try next') }}</h3><ul><li v-for="tip in tips" :key="tip">{{ t(tip) }}</li></ul></section>
    <p class="notice">{{ t('AI results are practice feedback, not a medical diagnosis. They can contain errors. Talk to your speech therapist about what you see.') }}</p>
  </div>
  <p v-else class="empty">{{ t('Result not found.') }} <RouterLink to="/app/reports" class="link">{{ t('Open reports') }}</RouterLink></p>
</template>

<style scoped>
.top { display: grid; gap: 20px; margin-bottom: 20px; }
.ring { display: flex; flex-direction: column; align-items: center; gap: 10px; }
ul { padding-inline-start: 20px; line-height: 1.7; margin: 10px 0 0; }
.notice { margin-top: 20px; }
@media (min-width: 800px) { .top { grid-template-columns: 240px 1fr; } .stats { align-content: stretch; } }
</style>
