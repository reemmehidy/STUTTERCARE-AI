import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/main.css'

createApp(App).use(router).mount('#app')

// Installable on phones (production build only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
