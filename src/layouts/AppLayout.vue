<script setup>
import { t } from '../i18n'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import LangToggle from '../components/LangToggle.vue'
import { session, signOut, unread } from '../stores/session'

const router = useRouter()
const nav = computed(() => {
  const role = session.user?.role
  const bell = { to: '/app/notifications', label: 'Notifications', badge: true }
  const settings = { to: '/app/settings', label: 'Settings' }
  if (role === 'admin') return [{ to: '/app/admin', label: 'Admin dashboard' }, settings]
  if (role === 'parent') return [{ to: '/app/parent', label: 'Dashboard' }, { to: '/app/child', label: 'Child progress' }, { to: '/app/learn', label: 'Learn' }, { to: '/app/premium', label: 'Premium' }, bell, settings]
  if (role === 'therapist') return [{ to: '/app/therapist', label: 'My patients' }, { to: '/app/plans', label: 'Training plans' }, { to: '/app/learn', label: 'Learn' }, { to: '/app/premium', label: 'Premium' }, bell, settings]
  const items = [{ to: '/app/home', label: 'Home' }, { to: '/app/exercises', label: 'Daily exercises' }, { to: '/app/coach', label: 'AI Speech Coach' }, { to: '/app/mirror', label: 'Mirror practice' }, { to: '/app/learn', label: 'Learn' }, { to: '/app/plan', label: 'Weekly plan' }, { to: '/app/progress', label: 'Progress' }, { to: '/app/reports', label: 'Reports' }, { to: '/app/feedback', label: 'Therapist feedback' }, { to: '/app/premium', label: 'Premium' }, bell, settings]
  items.splice(5, 0, ...(session.track === 'kids' ? [{ to: '/app/games', label: 'Games' }, { to: '/app/rewards', label: 'Rewards' }] : [{ to: '/app/simulations', label: 'Simulations' }, { to: '/app/insights', label: 'My insights' }]))
  return items
})
async function logout() { await signOut(); router.push('/welcome') }
</script>

<template>
  <div class="shell">
    <aside class="side">
      <div class="brandrow"><RouterLink to="/welcome" class="logo">{{ t('StutterCare AI') }}</RouterLink><LangToggle /></div>
      <nav :aria-label="t('Main')">
        <RouterLink v-for="n in nav" :key="n.to" :to="n.to" class="item">
          {{ t(n.label) }}<span v-if="n.badge && unread" class="dot">{{ unread }}</span>
        </RouterLink>
      </nav>
      <div class="me">
        <strong>{{ session.user?.name }}</strong>
        <span class="muted">{{ t(session.user?.role) }}<template v-if="session.track"> · {{ t(session.track) }}</template></span>
        <button class="pill ghost small" @click="logout">{{ t('Log out') }}</button>
      </div>
    </aside>
    <main class="content"><RouterView /></main>
  </div>
</template>

<style scoped>
.shell { min-height: 100dvh; display: flex; flex-direction: column; background: #fbf9ff; }
.side { background: #fff; border-bottom: 1px solid var(--line); padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.logo { font: 800 1.25rem var(--font-display); text-decoration: none; color: var(--brand-deep); }
nav { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
.item { white-space: nowrap; padding: 9px 14px; border-radius: 99px; text-decoration: none; font-weight: 700; display: flex; gap: 8px; align-items: center; }
.item:hover { background: var(--lav-soft); }
.item.router-link-active { background: var(--brand); color: #fff; }
.dot { background: var(--sun); color: var(--ink); border-radius: 99px; font-size: .75rem; padding: 1px 8px; }
.me { display: none; }
.brandrow { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.content { flex: 1; padding: 28px 18px 60px; width: min(1000px, 100%); margin-inline: auto; }
@media (min-width: 960px) {
  .shell { flex-direction: row; }
  .side { width: 270px; border-bottom: 0; border-inline-end: 1px solid var(--line); padding: 28px 18px; position: sticky; top: 0; height: 100dvh; }
  nav { flex-direction: column; overflow: visible; margin-top: 18px; }
  .item { border-radius: 14px; justify-content: space-between; }
  .me { display: flex; flex-direction: column; gap: 6px; margin-top: auto; align-items: flex-start; }
  .content { padding: 44px 40px 80px; }
}
</style>
