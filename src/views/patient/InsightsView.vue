<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { t } from '../../i18n'
import PageHeader from '../../components/PageHeader.vue'
import StatCard from '../../components/StatCard.vue'
import LineChart from '../../components/LineChart.vue'
import PremiumGate from '../../components/PremiumGate.vue'
import { session } from '../../stores/session'
import { api } from '../../api'
import { fmtDate } from '../../data/mock'

const SITUATIONS = [['phone', 'Phone calls'], ['meeting', 'Meetings'], ['shopping', 'Shopping'], ['family', 'Family'], ['work', 'Work'], ['social', 'Social'], ['other', 'Other']]
const checkins = ref([])
const error = ref('')
const saved = ref(false)
const form = reactive({ situation: 'phone', difficulty: 3, control: 3, note: '' })

const day = (d) => new Date(d).toLocaleDateString('en-CA')
const results = computed(() => session.results)
const streak = computed(() => {
  const days = new Set(results.value.map((r) => day(r.date)))
  let n = 0
  for (let d = new Date(); days.has(day(d)) || (n === 0 && days.has(day(new Date(Date.now() - 864e5)))); d = new Date(d - 864e5)) {
    if (days.has(day(d))) n++
    else if (n === 0) continue
  }
  return n
})
const week = computed(() => results.value.filter((r) => Date.now() - new Date(r.date) < 7 * 864e5))
const prevWeek = computed(() => results.value.filter((r) => { const a = Date.now() - new Date(r.date); return a >= 7 * 864e5 && a < 14 * 864e5 }))
const avg = (l) => (l.length ? Math.round(l.reduce((a, r) => a + r.score, 0) / l.length) : null)
const minutes = computed(() => Math.round(week.value.reduce((a, r) => a + (r.duration || 0), 0) / 60))
const change = computed(() => (avg(week.value) !== null && avg(prevWeek.value) !== null ? avg(week.value) - avg(prevWeek.value) : null))
const points = computed(() => results.value.slice(-12).map((r) => ({ label: fmtDate(r.date), value: r.score })))
const bySituation = computed(() => SITUATIONS.map(([id, label]) => {
  const l = checkins.value.filter((c) => c.situation === id)
  return { id, label, n: l.length, diff: l.length ? l.reduce((a, c) => a + c.difficulty, 0) / l.length : 0, ctl: l.length ? l.reduce((a, c) => a + c.control, 0) / l.length : 0 }
}).filter((x) => x.n))

async function load() {
  if (!session.user?.premium) return
  try { checkins.value = await api('/checkins/mine') } catch (e) { error.value = e.message }
}
async function save() {
  error.value = ''; saved.value = false
  try { await api('/checkins', { method: 'POST', body: { ...form } }); form.note = ''; saved.value = true; await load() } catch (e) { error.value = e.message }
}
onMounted(load)
</script>

<template>
  <PageHeader :title="t('My insights')" :subtitle="t('Track your progress in real situations, not only in practice.')" />
  <PremiumGate v-if="!session.user?.premium" feature="Insights and situation check-ins help you see what is getting easier." />
  <template v-else>
    <div class="grid-3 gap">
      <StatCard :label="t('Practice streak')" :value="streak" :hint="t('days in a row')" tone="sun" />
      <StatCard :label="t('This week')" :value="minutes" :hint="`${t('minutes')} · ${week.length} ${t('sessions')}`" tone="soft" />
      <StatCard :label="t('Score vs last week')" :value="change === null ? '-' : (change > 0 ? '+' : '') + change" :hint="avg(week) !== null ? `${t('average')} ${avg(week)}` : t('No sessions yet')" tone="mint" />
    </div>
    <section v-if="points.length" class="panel gap"><h3>{{ t('Practice score by session') }}</h3><LineChart :points="points" /></section>

    <section class="panel gap">
      <h3>{{ t('How did a real conversation go?') }}</h3>
      <p class="muted">{{ t('Log a moment from your day. Over time you will see which situations are easier and which need practice.') }}</p>
      <label class="f">{{ t('Situation') }}
        <select v-model="form.situation"><option v-for="s in SITUATIONS" :key="s[0]" :value="s[0]">{{ t(s[1]) }}</option></select>
      </label>
      <div class="f">{{ t('How hard was it? (1 easy, 5 very hard)') }}
        <div class="row"><button v-for="n in 5" :key="n" :class="['pill small', { ghost: form.difficulty !== n }]" @click="form.difficulty = n">{{ n }}</button></div>
      </div>
      <div class="f">{{ t('How in control did you feel? (1 not at all, 5 fully)') }}
        <div class="row"><button v-for="n in 5" :key="n" :class="['pill small', { ghost: form.control !== n }]" @click="form.control = n">{{ n }}</button></div>
      </div>
      <label class="f">{{ t('Note (optional)') }}<textarea v-model="form.note" rows="2" maxlength="300" /></label>
      <div class="row"><button class="pill" @click="save">{{ t('Save check-in') }}</button><span v-if="saved" class="tag good" role="status">{{ t('Saved') }}</span></div>
      <p v-if="error" class="err" role="alert">{{ t(error) }}</p>
    </section>

    <section v-if="bySituation.length" class="panel gap">
      <h3>{{ t('Where it is hardest') }}</h3>
      <div v-for="x in bySituation" :key="x.id" class="sit">
        <span>{{ t(SITUATIONS.find((s) => s[0] === x.id)[1]) }} <small class="muted">({{ x.n }})</small></span>
        <div class="meter" dir="ltr"><span :style="{ width: (x.diff / 5) * 100 + '%' }" /></div>
        <small>{{ x.diff.toFixed(1) }} / 5</small>
      </div>
      <p class="muted">{{ t('Longer bar = harder on average. Share this with your therapist.') }}</p>
    </section>
  </template>
  <p class="notice">{{ t('This is a self-tracking tool, not a diagnosis.') }}</p>
</template>

<style scoped>
.gap { margin-bottom: 20px; } h3 { margin-bottom: 8px; }
.f { display: flex; flex-direction: column; gap: 6px; font-weight: 700; margin: 12px 0; }
select, textarea { font: inherit; padding: 10px 12px; border-radius: 12px; border: 2px solid var(--line); background: #fff; }
.sit { display: grid; grid-template-columns: 130px 1fr 52px; align-items: center; gap: 10px; margin: 8px 0; }
.meter { height: 12px; background: var(--lav-soft); border-radius: 99px; overflow: hidden; }
.meter span { display: block; height: 100%; background: var(--brand); }
.err { color: var(--berry); }
</style>
