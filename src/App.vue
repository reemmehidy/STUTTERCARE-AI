<script setup>
import LanguageGate from './components/LanguageGate.vue'
</script>

<template>
  <LanguageGate />
  <RouterView v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>
