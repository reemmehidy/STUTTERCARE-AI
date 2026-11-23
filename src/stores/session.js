import { reactive, computed } from 'vue'
import { api, getToken, setToken, setUnauthorizedHandler } from '../api'
import { defaultPlan } from '../data/mock'

const READ_KEY = 'stuttercare-read'
const readIds = () => { try { return new Set(JSON.parse(localStorage.getItem(READ_KEY)) ?? []) } catch { return new Set() } }
const saveRead = (set) => { try { localStorage.setItem(READ_KEY, JSON.stringify([...set])) } catch { /* ignore */ } }
const dayKey = (d) => new Date(d).toLocaleDateString('en-CA') // local YYYY-MM-DD

// Everything here comes from the backend. Only the login token is kept in the browser.
export const session = reactive({
  user: null, track: null, stars: 0,
  results: [], feedback: [], notifications: [],
  plan: defaultPlan(), planNote: '',
  ready: false
})

export const unread = computed(() => session.notifications.filter((n) => !n.read).length)
export const homeFor = (user) => ({ parent: '/app/parent', therapist: '/app/therapist', admin: '/app/admin' }[user?.role] ?? '/app/home')

const reset = () => {
  Object.assign(session, { user: null, track: null, stars: 0, results: [], feedback: [], notifications: [], plan: defaultPlan(), planNote: '' })
}

function buildNotifications() {
  const read = readIds()
  session.notifications = session.feedback.map((f) => ({
    id: 'fb' + f.id, title: 'New note from ' + f.from, text: f.text,
    time: new Date(f.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), read: read.has('fb' + f.id)
  }))
}
export function markRead(n) {
  n.read = true
  const s = readIds(); s.add(n.id); saveRead(s)
}
export const markAllRead = () => session.notifications.forEach(markRead)

function applyUser(u) {
  session.user = u
  session.track = u.track ?? null
  session.stars = u.stars ?? 0
}

async function loadPatientData() {
  if (session.user?.role !== 'patient') return
  const [results, plan, feedback] = await Promise.allSettled([api('/results/mine'), api('/plans/mine'), api('/plans/feedback/mine')])
  if (results.status === 'fulfilled') { session.results = results.value.results; session.stars = results.value.stars }
  if (plan.status === 'fulfilled' && plan.value.plan) { session.plan = plan.value.plan; session.planNote = plan.value.note }
  if (feedback.status === 'fulfilled') session.feedback = feedback.value
  buildNotifications()
}

// Called after login / email verification.
export async function completeAuth({ token, user }) {
  setToken(token)
  applyUser(user)
  await loadPatientData()
}

export async function signOut() { setToken(null); reset() }
setUnauthorizedHandler(() => { signOut(); if (location.pathname.startsWith('/app')) location.assign('/login') })

// Restores the session on page load. The router waits for this promise.
export const ready = (async () => {
  if (getToken()) {
    try {
      const { user } = await api('/auth/me')
      applyUser(user)
      await loadPatientData()
    } catch (e) {
      if (e.status === 401 || e.status === 403) setToken(null)
    }
  }
  session.ready = true
})()

export async function chooseTrack(track) {
  const { user } = await api('/auth/me', { method: 'PUT', body: { track } })
  applyUser(user)
}
export async function saveProfile(profile) {
  const { user } = await api('/auth/me', { method: 'PUT', body: { profile } })
  applyUser(user)
}

export const isDone = (exId) => session.results.some((r) => r.exerciseId === exId && dayKey(r.date) === dayKey(Date.now()))

export async function addResult(r) {
  const res = await api('/results', { method: 'POST', body: r })
  session.results.push(res.result)
  session.stars = res.stars
  return res.result.id
}
export async function addStars(n) {
  const res = await api('/results/stars', { method: 'POST', body: { amount: n } })
  session.stars = res.stars
}
