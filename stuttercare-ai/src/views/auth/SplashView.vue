<script setup>
import { t } from '../../i18n'
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import WaveMark from '../../components/WaveMark.vue'
import { session, homeFor } from '../../stores/session'

const router = useRouter()
const next = () => router.push(session.user ? homeFor(session.user) : '/welcome')
const fluent = ref(false)
let t1, t2
onMounted(() => {
  t1 = setTimeout(() => (fluent.value = true), 500)
  t2 = setTimeout(next, 3200)
})
onBeforeUnmount(() => { clearTimeout(t1); clearTimeout(t2) })
</script>

<template>
  <section class="screen splash" @click="next">
    <WaveMark :fluent="fluent" :size="140" />
    <h1>{{ t('StutterCare') }} <span>{{ t('AI') }}</span></h1>
    <p class="muted">{{ t('Practice at your own pace.') }}</p>
  </section>
</template>

<style scoped>
.splash { min-height: 100dvh; align-items: center; justify-content: center; gap: 22px; text-align: center; background: linear-gradient(180deg, var(--paper), var(--mist)); cursor: pointer; }
h1 { font-size: 2.6rem; font-weight: 800; }
h1 span { color: var(--brand); }
</style>
