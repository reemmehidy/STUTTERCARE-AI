<script setup>
import { t } from '../../i18n'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { chooseTrack } from '../../stores/session'

const router = useRouter()
const tracks = [
  { id: 'kids', title: 'Kids', text: 'Voice games, stars and rewards.', tone: 'sun' },
  { id: 'adults', title: 'Adults', text: 'Real-life practice: interviews, calls, ordering food.', tone: 'brand' }
]
const error = ref('')
async function pick(id) {
  error.value = ''
  try { await chooseTrack(id); router.push('/profile') } catch (e) { error.value = e.message }
}
</script>

<template>
  <section class="screen">
    <h1>{{ t('Choose your track') }}</h1>
    <p class="muted intro">{{ t('You can change this later with your therapist.') }}</p>
    <p v-if="error" class="err" role="alert">{{ t(error) }}</p>
    <div class="cards-2">
      <button v-for="tk in tracks" :key="tk.id" :class="['card', tk.tone]" @click="pick(tk.id)">
        <h2>{{ t(tk.title) }}</h2>
        <p>{{ t(tk.text) }}</p>
      </button>
    </div>
  </section>
</template>

<style scoped>
.err { color: var(--berry); margin-bottom: 12px; }
h1 { font-size: 2.3rem; margin-top: 18px; }
.intro { margin: 8px 0 24px; }
.card { text-align: start; border: 0; border-radius: var(--radius-lg); padding: 28px 24px; min-height: 170px; cursor: pointer; font-family: var(--font-body); display: flex; flex-direction: column; justify-content: flex-end; gap: 8px; transition: transform .15s ease; }
.card:hover { transform: translateY(-3px); }
.card h2 { font-size: 2.2rem; }
.sun { background: var(--sun); color: var(--ink); border-top-left-radius: 70px; }
.brand { background: var(--brand); color: #fff; border-bottom-right-radius: 70px; }
</style>
