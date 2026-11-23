<script setup>
import { t } from '../../i18n'
import { computed } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { session } from '../../stores/session'
import { exerciseTitle, fmtDate } from '../../data/mock'

const print = () => window.print()
const rows = computed(() => [...session.results].reverse())
</script>

<template>
  <PageHeader :title="t('Performance reports')" :subtitle="t('Every recorded session, newest first.')">
    <button class="pill ghost" @click="print">{{ t('Print report') }}</button>
  </PageHeader>
  <section class="panel table-wrap" v-if="rows.length">
    <table class="table">
      <thead><tr><th>{{ t('Date') }}</th><th>{{ t('Exercise') }}</th><th>{{ t('Score') }}</th><th>{{ t('Rate (wpm)') }}</th><th>{{ t('Pauses') }}</th><th>{{ t('Repetitions') }}</th><th /></tr></thead>
      <tbody>
        <tr v-for="r in rows" :key="r.id">
          <td>{{ fmtDate(r.date) }}</td><td>{{ exerciseTitle(r.exerciseId) }}</td><td><strong>{{ r.score }}</strong></td>
          <template v-if="r.kind === 'coach'"><td class="muted">{{ t('word:') }} {{ r.word }}</td><td class="muted">-</td><td class="muted">{{ r.attempts }} {{ t('tries') }}</td><td /></template>
          <template v-else><td>{{ r.wpm || '-' }}</td><td>{{ r.pauses }}</td><td>{{ r.repetitions }}</td>
          <td><RouterLink :to="`/app/results/${r.id}`" class="link">{{ t('View') }}</RouterLink></td></template>
        </tr>
      </tbody>
    </table>
  </section>
  <p v-else class="empty">{{ t('No reports yet.') }}</p>
</template>

