<script setup>
import { t } from '../i18n'
defineProps({ feature: { type: String, default: '' } })
</script>

<template>
  <section class="panel gate">
    <div class="lock" aria-hidden="true">★</div>
    <h3>{{ t('This is a Premium feature') }}</h3>
    <p class="muted">{{ feature ? t(feature) : t('Unlock advanced tools for faster progress.') }}</p>
    <RouterLink to="/app/premium" class="pill sun">{{ t('See Premium') }}</RouterLink>
  </section>
</template>

<style scoped>
.gate { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 36px 20px; }
.lock { font-size: 2.4rem; color: var(--sun, #ffc83d); }
</style>
