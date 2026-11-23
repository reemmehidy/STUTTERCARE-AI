// Tiny English/Arabic translation layer.
// - t('English text') returns the Arabic text when the language is Arabic (falls back to English).
// - bi({ title: { en, ar } }) makes content objects whose fields follow the current language.
import { ref } from 'vue'
import { ar } from './locales/ar'

const KEY = 'stuttercare-lang'
const initial = () => {
  try { const s = localStorage.getItem(KEY); if (s === 'ar' || s === 'en') return s } catch { /* ignore */ }
  return (typeof navigator !== 'undefined' && (navigator.language || '').startsWith('ar')) ? 'ar' : 'en'
}

export const lang = ref(initial())
// false until the person picks a language once (the app then shows a language chooser).
export const langChosen = ref((() => { try { return !!localStorage.getItem(KEY) } catch { return true } })())

function apply() {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang.value
  document.documentElement.dir = lang.value === 'ar' ? 'rtl' : 'ltr'
}
apply()

export function setLang(l) {
  lang.value = l === 'ar' ? 'ar' : 'en'
  langChosen.value = true
  try { localStorage.setItem(KEY, lang.value) } catch { /* ignore */ }
  apply()
}
export const toggleLang = () => setLang(lang.value === 'ar' ? 'en' : 'ar')
export const speechLang = () => (lang.value === 'ar' ? 'ar-EG' : 'en-US')

// Messages that carry numbers/names (mostly from the server).
const rules = [
  [/^Incorrect code\. (\d+) attempt\(s\) left\.$/, (n) => `الرمز غير صحيح. متبقي ${n} محاولة.`],
  [/^Resend in (\d+)s$/, (n) => `إعادة الإرسال بعد ${n} ثانية`],
  [/^Linked with (.+)\.$/, (n) => `تم الربط مع ${n}.`],
  [/^Your result could not be saved: (.+)$/, (m) => `تعذّر حفظ نتيجتك: ${m}`],
  [/^New note from (.+)$/, (n) => `ملاحظة جديدة من ${n}`],
  [/^Hi (.+)$/, (n) => `أهلا ${n}`],
  [/^(.+)'s dashboard$/, (n) => `لوحة ${n}`],
  [/^(.+)'s progress$/, (n) => `تقدّم ${n}`],
  [/^You have (\d+) stars$/, (n) => `عندك ${n} نجمة`],
  [/^(\d+) min$/, (n) => `${n} دقيقة`],
  [/^(\d+) tries$/, (n) => `${n} محاولات`],
  [/^I heard "(.+)"\. Try "(.+)" again, slowly and softly\.$/, (h, w) => `سمعتك تقول "${h}". جرّب "${w}" تاني ببطء وهدوء.`]
]

export function t(s) {
  if (typeof s !== 'string' || lang.value === 'en') return s
  const hit = ar[s]
  if (hit !== undefined) return hit
  for (const [re, fn] of rules) {
    const m = s.match(re)
    if (m) return fn(...m.slice(1))
  }
  return s
}

const isBi = (v) => v && typeof v === 'object' && !Array.isArray(v) && 'en' in v && 'ar' in v

// Deeply turns { en, ar } leaves into getters that follow the current language.
export function bi(o) {
  if (Array.isArray(o)) return o.map((x) => (x && typeof x === 'object' && !isBi(x) ? bi(x) : x))
  const out = {}
  for (const [k, v] of Object.entries(o)) {
    if (isBi(v)) Object.defineProperty(out, k, { get: () => v[lang.value], enumerable: true })
    else if (v && typeof v === 'object') out[k] = bi(v)
    else out[k] = v
  }
  return out
}

// Locale-aware date, e.g. "8 Nov" / "٨ نوفمبر".
export const fmtDateLocal = (iso) => new Date(iso).toLocaleDateString(lang.value === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' })
