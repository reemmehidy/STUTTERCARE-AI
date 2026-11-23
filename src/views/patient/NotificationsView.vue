<script setup>
import { t } from '../../i18n'
import PageHeader from '../../components/PageHeader.vue'
import { session, markAllRead, markRead, unread } from '../../stores/session'
</script>

<template>
  <PageHeader :title="t('Notifications')" :subtitle="unread ? `${unread} unread` : t('You are all caught up.')">
    <button v-if="unread" class="pill ghost small" @click="markAllRead">{{ t('Mark all as read') }}</button>
  </PageHeader>
  <p v-if="!session.notifications.length" class="empty">{{ t('No notifications yet.') }}</p>
  <div class="stack">
    <article v-for="n in session.notifications" :key="n.id" :class="['panel n', { new: !n.read }]" @click="markRead(n)">
      <div class="row between"><strong>{{ n.title }}</strong><span class="muted">{{ n.time }}</span></div>
      <p class="muted">{{ n.text }}</p>
    </article>
  </div>
</template>

<style scoped>
.n { cursor: pointer; } .n.new { border-color: var(--brand); background: var(--lav-soft); }
</style>
