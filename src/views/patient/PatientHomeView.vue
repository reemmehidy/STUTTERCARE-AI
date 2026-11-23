<script setup>
import { t } from '../../i18n'
import { computed } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import StatCard from '../../components/StatCard.vue'
import WaveMark from '../../components/WaveMark.vue'
import { session, isDone } from '../../stores/session'
import { exercises, todayName, fmtDate } from '../../data/mock'

const today = computed(() => (session.plan[todayName()] ?? []).map((id) => exercises.find((e) => e.id === id)).filter(Boolean))
const doneCount = computed(() => today.value.filter((e) => isDone(e.id)).length)
const last = computed(() => session.results.at(-1))
const unreadFeedback = computed(() => session.feedback[0])
</script>

<template>
  <PageHeader :title="`${t('Hi')} ${session.user?.name}`" :subtitle="session.track === 'kids' ? t('Ready for a voice game?') : t('Ready for today\'s practice?')">
    <RouterLink to="/app/exercises" class="pill">{{ t('Start practice') }}</RouterLink>
  </PageHeader>
  <div class="grid-3">
    <StatCard :label="t('Today')" :value="`${doneCount}/${today.length}`" :hint="t('exercises done')" tone="soft" />
    <StatCard :label="t('Latest score')" :value="last?.score ?? '-'" :hint="last ? fmtDate(last.date) : t('No sessions yet')" tone="mint" />
    <StatCard v-if="session.track === 'kids'" :label="t('Stars')" :value="session.stars" :hint="t('collect them in games')" tone="sun" />
    <StatCard v-else :label="t('Sessions')" :value="session.results.length" :hint="t('recorded so far')" tone="sun" />
  </div>
  <section class="panel today">
    <WaveMark fluent :size="70" />
    <div class="stack">
      <h2>{{ t('Today\'s exercises') }}</h2>
      <p v-if="!today.length" class="muted">{{ t('Nothing planned today. Enjoy your rest, or practice anything from the list.') }}</p>
      <div v-for="e in today" :key="e.id" class="row between">
        <span>{{ e.title }} <span class="tag" :class="{ good: isDone(e.id) }">{{ isDone(e.id) ? t('Done') : e.minutes + ' ' + t('min') }}</span></span>
        <RouterLink :to="`/app/exercises/${e.id}`" class="link">{{ t('Open') }}</RouterLink>
      </div>
    </div>
  </section>
  <section v-if="unreadFeedback" class="panel soft">
    <h3>{{ t('From your therapist') }}</h3>
    <p>{{ unreadFeedback.text }}</p>
  </section>
</template>

<style scoped>
.grid-3, .today { margin-bottom: 20px; }
.today { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; }
.today .stack { flex: 1; min-width: 240px; }
</style>
