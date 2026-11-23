<script setup>
// Arkan's animated face. state: idle | speaking | listening | happy
defineProps({ state: { type: String, default: 'idle' }, size: { type: Number, default: 120 } })
</script>

<template>
  <div :class="['arkan', state]" :style="{ width: size + 'px', height: size + 'px' }" role="img" aria-label="Arkan">
    <svg viewBox="0 0 120 120" width="100%" height="100%">
      <circle class="ring" cx="60" cy="60" r="54" fill="none" stroke="var(--brand)" stroke-width="3" />
      <circle cx="60" cy="62" r="42" fill="#ffe0c2" />
      <path d="M20 54 C20 24 100 24 100 54 C92 40 28 40 20 54 Z" fill="var(--brand-deep)" />
      <rect x="12" y="50" width="12" height="26" rx="6" fill="var(--brand)" />
      <rect x="96" y="50" width="12" height="26" rx="6" fill="var(--brand)" />
      <g class="eyes"><ellipse cx="45" cy="60" rx="4.5" ry="5.5" fill="#2a1a5e" /><ellipse cx="75" cy="60" rx="4.5" ry="5.5" fill="#2a1a5e" /></g>
      <circle cx="36" cy="74" r="6" fill="#ffb4b4" opacity=".55" /><circle cx="84" cy="74" r="6" fill="#ffb4b4" opacity=".55" />
      <path v-if="state !== 'speaking'" :d="state === 'happy' ? 'M44 78 Q60 96 76 78' : 'M48 80 Q60 88 72 80'" fill="none" stroke="#2a1a5e" stroke-width="3.5" stroke-linecap="round" />
      <ellipse v-else class="mouth" cx="60" cy="82" rx="9" ry="6" fill="#7a2d4a" />
    </svg>
    <span v-if="state === 'happy'" class="spark s1">✦</span><span v-if="state === 'happy'" class="spark s2">✦</span>
  </div>
</template>

<style scoped>
.arkan { position: relative; display: inline-block; }
.ring { opacity: 0; transform-origin: 60px 60px; }
.listening .ring { animation: ripple 1.4s infinite; }
.eyes { transform-origin: 60px 60px; animation: blink 4.5s infinite; }
.speaking .mouth { transform-origin: 60px 82px; animation: talk .35s infinite alternate; }
.speaking { animation: bob 1s infinite; }
.spark { position: absolute; color: var(--sun, #ffc83d); font-size: 1.4rem; animation: pop 1s infinite; }
.s1 { top: 0; inset-inline-end: 6px; } .s2 { top: 18px; inset-inline-start: 0; animation-delay: .4s; }
@keyframes ripple { 0% { opacity: .9; transform: scale(.9); } 100% { opacity: 0; transform: scale(1.15); } }
@keyframes blink { 0%, 94%, 100% { transform: scaleY(1); } 97% { transform: scaleY(.1); } }
@keyframes talk { from { transform: scaleY(.4); } to { transform: scaleY(1.2); } }
@keyframes bob { 50% { transform: translateY(-3px); } }
@keyframes pop { 50% { transform: scale(1.4); opacity: .5; } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>
