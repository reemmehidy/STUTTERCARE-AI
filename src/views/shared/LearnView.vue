<script setup>
import { computed, ref } from 'vue'
import { t } from '../../i18n'
import PageHeader from '../../components/PageHeader.vue'
import { session } from '../../stores/session'
import { articles, learnTopics } from '../../data/learn'

const roleTopic = computed(() => ({ parent: 'parents', patient: session.track === 'kids' ? 'kids' : 'adults' }[session.user?.role]))
const topic = ref('all')
const open = ref(null)
const shown = computed(() => articles.filter((a) => topic.value === 'all' || a.topics.includes(topic.value)))
const topics = computed(() => learnTopics.filter((x) => x.id !== 'kids' || session.user?.role !== 'therapist' || true))
</script>

<template>
  <PageHeader :title="t('Learn')" :subtitle="t('Short, practical tips about speech, breathing and pronunciation.')" />
  <div class="row tabs" role="tablist">
    <button v-for="x in topics" :key="x.id" role="tab" :aria-selected="topic === x.id" :class="['pill small', { ghost: topic !== x.id }]" @click="topic = x.id">{{ x.label }}</button>
    <button v-if="roleTopic" class="pill small sun" @click="topic = roleTopic">{{ t('Recommended for you') }}</button>
  </div>
  <div class="stack">
    <article v-for="a in shown" :key="a.id" class="panel">
      <button class="head" :aria-expanded="open === a.id" @click="open = open === a.id ? null : a.id">
        <h3>{{ a.title }}</h3><span class="chev">{{ open === a.id ? '−' : '+' }}</span>
      </button>
      <ul v-if="open === a.id"><li v-for="(p, i) in a.points" :key="i">{{ p }}</li></ul>
    </article>
  </div>
  <p class="notice">{{ t('This is general practice guidance, not medical advice. A speech-language therapist can give advice that fits you.') }}</p>
</template>

<style scoped>
.tabs { flex-wrap: wrap; margin-bottom: 20px; gap: 8px; }
.stack { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.head { all: unset; cursor: pointer; display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 12px; }
.chev { font: 700 1.5rem var(--font-display); color: var(--brand); }
ul { padding-inline-start: 22px; line-height: 1.8; margin: 14px 0 0; display: flex; flex-direction: column; gap: 6px; }
</style>
