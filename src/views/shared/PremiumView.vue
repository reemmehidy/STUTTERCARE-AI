<script setup>
import { computed } from 'vue'
import { t, lang } from '../../i18n'
import PageHeader from '../../components/PageHeader.vue'
import { session } from '../../stores/session'

// Edit these in stuttercare-ai/.env (VITE_PRICE_MONTHLY, VITE_PRICE_YEARLY, VITE_WHATSAPP, VITE_PAY_METHODS).
const env = import.meta.env
const monthly = env.VITE_PRICE_MONTHLY || ''
const yearly = env.VITE_PRICE_YEARLY || ''
const methods = env.VITE_PAY_METHODS || 'InstaPay / Vodafone Cash'
const wa = (env.VITE_WHATSAPP || '').replace(/\D/g, '')

const until = computed(() => (session.user?.premiumUntil ? new Date(session.user.premiumUntil) : null))
const daysLeft = computed(() => (until.value ? Math.max(0, Math.ceil((until.value - Date.now()) / 864e5)) : 0))
const msg = computed(() => encodeURIComponent(`${t('Hello, I want to subscribe to StutterCare Premium. My email:')} ${session.user?.email}`))
const rows = [
  ['Daily exercises, games and AI Speech Coach', true, true],
  ['Learn articles', true, true],
  ['Advanced techniques (pull-out, phone practice)', false, true],
  ['All real-life simulations', false, true],
  ['Insights dashboard and situation check-ins', false, true],
  ['Detailed reports for your therapist', false, true]
]
</script>

<template>
  <PageHeader :title="t('Premium')" :subtitle="t('More tools for faster, steadier progress.')" />
  <p v-if="session.user?.premium" class="notice ok">
    {{ t('Your Premium is active') }}<span v-if="until"> · {{ t('days left:') }} {{ daysLeft }}</span>
  </p>
  <section class="panel table-wrap">
    <table class="table">
      <thead><tr><th>{{ t('Feature') }}</th><th>{{ t('Free') }}</th><th>{{ t('Premium') }}</th></tr></thead>
      <tbody>
        <tr v-for="r in rows" :key="r[0]"><td>{{ t(r[0]) }}</td><td>{{ r[1] ? '✓' : '—' }}</td><td>✓</td></tr>
      </tbody>
    </table>
  </section>
  <section class="panel soft how">
    <h3>{{ t('How to subscribe') }}</h3>
    <p v-if="monthly || yearly"><strong>{{ monthly }}</strong><span v-if="monthly && yearly"> · </span><strong>{{ yearly }}</strong></p>
    <ol>
      <li>{{ t('Pay using') }}: <strong>{{ methods }}</strong></li>
      <li>{{ t('Send us the payment screenshot with your account email.') }}</li>
      <li>{{ t('We activate Premium on your account, usually within a few hours.') }}</li>
    </ol>
    <a v-if="wa" class="pill sun" :href="`https://wa.me/${wa}?text=${msg}`" target="_blank" rel="noopener">{{ t('Contact us on WhatsApp') }}</a>
    <p v-else class="muted">{{ t('Payment contact is not set yet.') }}</p>
  </section>
</template>

<style scoped>
.panel { margin-bottom: 20px; }
.how { display: flex; flex-direction: column; gap: 10px; }
ol { padding-inline-start: 22px; line-height: 1.9; }
.ok { background: #d6f5e3; }
</style>
