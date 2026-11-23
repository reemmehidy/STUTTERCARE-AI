<script setup>
import { computed, onMounted, ref } from 'vue'
import { t } from '../../i18n'
import PageHeader from '../../components/PageHeader.vue'
import StatCard from '../../components/StatCard.vue'
import { api } from '../../api'
import { fmtDate } from '../../data/mock'

const s = ref(null)
const error = ref('')
const days = ref({})
const max = computed(() => Math.max(1, ...(s.value?.signups ?? []).map((x) => x.n)))

async function load() {
  try { s.value = await api('/admin/stats') } catch (e) { error.value = e.message }
}
async function grant(u) {
  const d = Number(days.value[u.id] ?? 30)
  try { await api(`/admin/users/${u.id}/premium`, { method: 'PUT', body: { days: d } }); await load() } catch (e) { error.value = e.message }
}
const ago = (d) => (d ? fmtDate(d) : '—')
onMounted(load)
</script>

<template>
  <PageHeader :title="t('Admin dashboard')" :subtitle="t('Who is using StutterCare AI.')" />
  <p v-if="error" class="err" role="alert">{{ t(error) }}</p>
  <template v-if="s">
    <div class="grid-3 gap">
      <StatCard :label="t('Total accounts')" :value="s.total" :hint="`${s.verified} ${t('verified')}`" tone="soft" />
      <StatCard :label="t('New in 7 days')" :value="s.new7" :hint="`${s.new30} ${t('in 30 days')}`" tone="mint" />
      <StatCard :label="t('Active in 7 days')" :value="s.active7" :hint="`${s.active30} ${t('in 30 days')}`" tone="sun" />
      <StatCard :label="t('Premium now')" :value="s.premium" tone="soft" />
      <StatCard :label="t('Practice sessions')" :value="s.sessions" tone="mint" />
      <StatCard :label="t('Kids / adults')" :value="`${s.byTrack.kids ?? 0} / ${s.byTrack.adults ?? 0}`" :hint="`${t('parents')} ${s.byRole.parent ?? 0} · ${t('therapists')} ${s.byRole.therapist ?? 0}`" tone="sun" />
    </div>
    <section class="panel gap">
      <h3>{{ t('New accounts, last 14 days') }}</h3>
      <div class="bars" dir="ltr">
        <div v-for="x in s.signups" :key="x._id" class="bar" :title="`${x._id}: ${x.n}`"><span :style="{ height: (x.n / max) * 100 + '%' }" /><small>{{ x.n }}</small></div>
        <p v-if="!s.signups.length" class="muted">—</p>
      </div>
    </section>
    <section class="panel table-wrap">
      <h3>{{ t('Latest accounts') }}</h3>
      <table class="table">
        <thead><tr><th>{{ t('Name') }}</th><th>{{ t('Email') }}</th><th>{{ t('Role') }}</th><th>{{ t('Track') }}</th><th>{{ t('Joined') }}</th><th>{{ t('Last seen') }}</th><th>{{ t('Plan') }}</th></tr></thead>
        <tbody>
          <tr v-for="u in s.recent" :key="u.id">
            <td>{{ u.name }}</td><td dir="ltr">{{ u.email }}</td><td>{{ t(u.role) }}</td><td>{{ u.track ? t(u.track) : '—' }}</td>
            <td>{{ ago(u.createdAt) }}</td><td>{{ ago(u.lastSeenAt) }}</td>
            <td class="plan">
              <span :class="['tag', u.plan === 'premium' ? 'good' : '']">{{ u.plan === 'premium' ? t('Premium') : t('Free') }}</span>
              <select v-model="days[u.id]" :aria-label="t('Days')"><option :value="30">30</option><option :value="90">90</option><option :value="365">365</option><option :value="0">{{ t('Remove') }}</option></select>
              <button class="pill small" @click="grant(u)">{{ t('Apply') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </template>
</template>

<style scoped>
.gap { margin-bottom: 20px; } h3 { margin-bottom: 12px; } .err { color: var(--berry); }
.bars { display: flex; align-items: flex-end; gap: 8px; height: 140px; }
.bar { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; height: 100%; }
.bar span { width: 100%; max-width: 28px; background: var(--brand); border-radius: 6px 6px 0 0; min-height: 3px; }
.bar small { margin-top: 4px; }
.plan { display: flex; gap: 6px; align-items: center; white-space: nowrap; }
.plan select { font: inherit; padding: 4px 6px; border-radius: 8px; border: 1px solid var(--line); }
</style>
