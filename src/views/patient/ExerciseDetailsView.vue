<script setup>
import { t } from '../../i18n'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '../../components/PageHeader.vue'
import PremiumGate from '../../components/PremiumGate.vue'
import { session } from '../../stores/session'
import { exercises } from '../../data/mock'

const route = useRoute()
const ex = computed(() => exercises.find((e) => e.id === route.params.id))
const locked = computed(() => ex.value?.premium && !session.user?.premium)
</script>

<template>
  <div v-if="ex && locked">
    <RouterLink to="/app/exercises" class="link">{{ t('Back to exercises') }}</RouterLink>
    <PageHeader :title="ex.title" :subtitle="ex.goal" />
    <PremiumGate feature="Advanced techniques help with harder situations." />
  </div>
  <div v-else-if="ex">
    <RouterLink to="/app/exercises" class="link">{{ t('Back to exercises') }}</RouterLink>
    <PageHeader :title="ex.title" :subtitle="ex.goal">
      <RouterLink :to="`/app/record/${ex.id}`" class="pill">{{ t('Start recording') }}</RouterLink>
    </PageHeader>
    <div class="grid-2">
      <section class="panel">
        <h3>{{ t('Instructions') }}</h3>
        <ol><li v-for="s in ex.steps" :key="s">{{ s }}</li></ol>
        <p class="muted">{{ ex.minutes }} {{ t('minutes ·') }} {{ ex.level }} · {{ ex.type }}</p>
      </section>
      <section class="panel soft">
        <h3>{{ t('Say these') }}</h3>
        <p v-for="p in ex.phrases" :key="p" class="phrase">{{ p }}</p>
      </section>
    </div>
  </div>
  <p v-else class="empty">{{ t('Exercise not found.') }} <RouterLink to="/app/exercises" class="link">{{ t('See all exercises') }}</RouterLink></p>
</template>

<style scoped>
ol { padding-inline-start: 20px; display: flex; flex-direction: column; gap: 10px; line-height: 1.5; }
.phrase { font: 700 1.3rem var(--font-display); padding: 10px 0; border-bottom: 1px solid var(--line); }
h3 { margin-bottom: 12px; }
</style>
