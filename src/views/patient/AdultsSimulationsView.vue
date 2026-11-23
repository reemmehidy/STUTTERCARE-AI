<script setup>
import { t } from '../../i18n'
import { ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import PremiumGate from '../../components/PremiumGate.vue'
import { session } from '../../stores/session'
import { simulations } from '../../data/mock'

const current = ref(simulations[0])
// The first two scenes are free; the rest are Premium.
const FREE = 2
const locked = (s) => simulations.indexOf(s) >= FREE && !session.user?.premium
</script>

<template>
  <PageHeader :title="t('Simulations')" :subtitle="t('Rehearse real situations before they happen.')" />
  <div class="row tabs">
    <button v-for="s in simulations" :key="s.id" :class="['pill small', { ghost: current.id !== s.id }]" @click="current = s">{{ locked(s) ? '★ ' : '' }}{{ s.title }}</button>
  </div>
  <PremiumGate v-if="locked(current)" feature="All real-life simulations are part of Premium." />
  <section v-else class="panel">
    <div v-for="(l, i) in current.lines" :key="i" :class="['line', l.me ? 'me' : 'them']">
      <small>{{ l.who }}</small><p>{{ l.text }}</p>
    </div>
    <RouterLink :to="`/app/record/sim-${current.id}`" class="pill go">{{ t('Practice this scene') }}</RouterLink>
  </section>
</template>

<style scoped>
.tabs { margin-bottom: 20px; }
.line { max-width: 560px; padding: 12px 16px; border-radius: 18px; margin-bottom: 12px; }
.them { background: var(--lav-soft); } .me { background: var(--mint); margin-inline-start: auto; }
small { font-weight: 700; }
.go { margin-top: 10px; }
</style>
