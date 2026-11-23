<script setup>
import { langChosen, setLang } from '../i18n'
</script>

<template>
  <div v-if="!langChosen" class="gate" role="dialog" aria-modal="true" aria-label="Choose your language">
    <div class="box">
      <h1>StutterCare AI</h1>
      <p>اختر لغتك &middot; Choose your language</p>
      <div class="row">
        <button class="pill sun big" @click="setLang('ar')">العربية</button>
        <button class="pill big" @click="setLang('en')">English</button>
      </div>
      <small>تقدر تغيّرها في أي وقت &middot; You can change it any time</small>
    </div>
  </div>
</template>

<style scoped>
.gate { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; background: linear-gradient(160deg, var(--lav-soft, #f3edff), #fff); padding: 20px; }
.box { text-align: center; display: flex; flex-direction: column; gap: 18px; align-items: center; max-width: 420px; }
h1 { font: 800 2.4rem var(--font-display); color: var(--brand-deep); }
.row { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
.big { font-size: 1.3rem; padding: 16px 34px; }
</style>
