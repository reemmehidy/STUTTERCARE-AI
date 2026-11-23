<script setup>
import { lang, toggleLang } from '../i18n'
</script>

<template>
  <button type="button" class="lang" :aria-label="lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'" @click="toggleLang">
    {{ lang === 'ar' ? 'English' : 'عربي' }}
  </button>
</template>

<style scoped>
.lang { font: 700 .9rem var(--font-body); padding: 8px 14px; border-radius: 99px; border: 2px solid var(--line); background: #fff; color: var(--brand-deep); cursor: pointer; }
.lang:hover { border-color: var(--brand); }
</style>
