<script setup>
import { t } from '../../i18n'
import { privacy } from '../../data/legal'
const contact = import.meta.env.VITE_CONTACT_EMAIL || ''
</script>

<template>
  <main class="legal">
    <RouterLink to="/welcome" class="link">{{ t('Back') }}</RouterLink>
    <h1>{{ t('Privacy Policy') }}</h1>
    <section v-for="s in privacy" :key="s.h">
      <h2>{{ s.h }}</h2>
      <p v-for="(x, i) in s.p" :key="i">{{ x }}</p>
    </section>
    <p v-if="contact" class="muted">{{ t('Questions? Contact us:') }} <a :href="`mailto:${contact}`" dir="ltr">{{ contact }}</a></p>
  </main>
</template>

<style scoped>
.legal { max-width: 760px; margin: 0 auto; padding: 32px 20px 60px; line-height: 1.8; }
h1 { font: 800 2.2rem var(--font-display); margin: 12px 0 20px; }
h2 { font: 700 1.2rem var(--font-display); margin: 22px 0 6px; }
</style>
