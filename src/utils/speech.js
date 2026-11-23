// Browser speech helpers: recognition (listen) and synthesis (speak).
// Note: in Chrome/Edge the recognition audio is processed by the browser vendor's service.
const Rec = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
export const recognitionSupported = !!Rec

const err = (code) => Object.assign(new Error(code), { code })

// One-shot listener: resolves with the recognizer's best guesses for a single utterance.
const L = (lang) => (typeof lang === 'function' ? lang() : lang)

export function createListener(lang = 'en-US') {
  let rec = null
  const listen = () => new Promise((resolve, reject) => {
    if (!Rec) return reject(err('unsupported'))
    let got = false
    rec = new Rec()
    rec.lang = L(lang)
    rec.interimResults = false
    rec.continuous = false
    rec.maxAlternatives = 5
    rec.onresult = (e) => {
      got = true
      const r = e.results[0]
      const alternatives = []
      for (let i = 0; i < r.length; i++) alternatives.push({ text: r[i].transcript, confidence: r[i].confidence })
      resolve({ alternatives })
    }
    rec.onerror = (e) => { if (!got) reject(err(e.error)) }
    rec.onend = () => { if (!got) resolve({ alternatives: [] }) }
    try { rec.start() } catch (e) { reject(err(e.name || 'start-failed')) }
  })
  const stop = () => { try { rec?.abort() } catch { /* ignore */ } }
  return { listen, stop }
}

// Continuous transcript while a recording runs (restarts itself when the browser stops it).
export function createTranscriber(lang = 'en-US') {
  let rec = null, active = false, text = ''
  const boot = () => {
    rec = new Rec()
    rec.lang = L(lang); rec.continuous = true; rec.interimResults = false
    rec.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += ' ' + e.results[i][0].transcript }
    rec.onerror = () => {}
    rec.onend = () => { if (active) { try { boot() } catch { /* ignore */ } } }
    try { rec.start() } catch { /* ignore */ }
  }
  const start = () => { if (!Rec) return false; active = true; text = ''; boot(); return true }
  const stop = () => new Promise((resolve) => {
    active = false
    const done = () => resolve(text.trim())
    if (!rec) return done()
    rec.onend = done
    try { rec.stop() } catch { return done() }
    setTimeout(done, 1500)
  })
  return { start, stop }
}

export const stopSpeaking = () => { try { window.speechSynthesis?.cancel() } catch { /* ignore */ } }

// Speaks text; always resolves (even if speech is unavailable) so conversations never hang.
export function speak(text, { rate = 0.9, lang = 'en-US' } = {}) {
  lang = L(lang)
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve()
    stopSpeaking()
    const u = new SpeechSynthesisUtterance(String(text).replace(/"/g, ''))
    u.lang = lang; u.rate = rate
    const prefix = lang.slice(0, 2)
    const all = window.speechSynthesis.getVoices()
    const voice = all.find((v) => v.lang.startsWith(prefix) && /female|samantha|google|zira|aria|hoda|salma|laila/i.test(v.name)) || all.find((v) => v.lang.startsWith(prefix))
    if (voice) u.voice = voice
    let finished = false
    const end = () => { if (!finished) { finished = true; resolve() } }
    u.onend = end; u.onerror = end
    setTimeout(end, Math.max(2500, (String(text).length * 130) / rate)) // Chrome sometimes never fires onend
    window.speechSynthesis.speak(u)
  })
}
