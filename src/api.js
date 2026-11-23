// Thin wrapper around fetch for the StutterCare backend.
const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '') + '/api'
const TOKEN_KEY = 'stuttercare-token'

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* storage unavailable */ } }

let onUnauthorized = null
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

export class ApiError extends Error {
  constructor(message, status, data) { super(message); this.status = status; this.data = data; this.code = data?.code; this.fields = data?.fields }
}

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`
  let res
  try {
    res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
  } catch {
    throw new ApiError('Cannot reach the server. It may be waking up: wait a minute and try again.', 0, null)
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && auth && token && onUnauthorized) onUnauthorized()
    throw new ApiError(data?.message || 'Something went wrong. Please try again.', res.status, data)
  }
  return data
}
