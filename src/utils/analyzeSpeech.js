// Real measurements from a recording: audio loudness over time + the browser's transcript.
// Nothing here is random. If we could not hear speech, the caller must not show a score.

import { words, near } from './text.js'

// Short common words are not stutter fragments (English + Arabic).
const COMMON = new Set(['a', 'i', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 'is', 'it', 'me', 'my', 'no', 'of', 'oh', 'on', 'or', 'so', 'to', 'up', 'us', 'we',
  'في', 'من', 'ما', 'لا', 'يا', 'مع', 'عن', 'او', 'ان', 'هل', 'قد', 'كل', 'ثم', 'اي', 'لم', 'لن', 'هو', 'هي', 'ده', 'دي', 'انا', 'ال', 'بس', 'يعني'])

export const tokenize = words

// Counts repetition EVENTS: whole-word repeats ("I I I want") and part-word repeats
// ("b b ball", "ba ball"). A run of repeats counts once.
export function countRepetitions(tokens) {
  let n = 0
  let inRun = false
  for (let i = 1; i < tokens.length; i++) {
    const prev = tokens[i - 1], cur = tokens[i]
    const repeat = cur === prev || (prev.length <= 2 && !COMMON.has(prev) && cur.length > prev.length && cur.startsWith(prev))
    if (repeat && !inRun) n++
    inRun = repeat
  }
  return n
}

// Share of the expected words that were actually recognized (null when there is nothing to compare).
export function coverage(tokens, phrases) {
  const want = [...new Set((phrases || []).flatMap(tokenize))]
  if (!want.length) return null
  return want.filter((w) => tokens.some((h) => near(h, w))).length / want.length
}

// Possible prolongations ("ssssun"): a loud sound whose spectrum barely changes for 700 ms or more.
// centroids = spectral centroid of each 100 ms frame. This is an estimate, not a diagnosis.
export function countProlongations(levels, centroids, voiced, minFrames = 7) {
  if (!centroids || centroids.length !== levels.length) return 0
  let n = 0, run = 0
  for (let i = 1; i <= levels.length; i++) {
    const ok = i < levels.length && voiced[i] && voiced[i - 1] && centroids[i - 1] > 0 && Math.abs(centroids[i] - centroids[i - 1]) / centroids[i - 1] < 0.04
    if (ok) run++
    else { if (run + 1 >= minFrames) n++; run = 0 }
  }
  return n
}

// levels: loudness (0..1) sampled every stepMs. Returns voiced time, long pauses and prolongations.
export function analyzeLevels(levels, stepMs = 100, pauseMs = 1200, centroids = null) {
  const totalSec = (levels.length * stepMs) / 1000
  const none = { totalSec, voicedSec: 0, speakingSec: 0, pauses: 0, prolongations: 0 }
  if (levels.length < 8) return none
  const sorted = [...levels].sort((a, b) => a - b)
  const floor = sorted[Math.floor(sorted.length * 0.1)]
  const peak = sorted[Math.floor(sorted.length * 0.95)]
  if (peak < 0.02) return none // basically silence
  // Above the background noise, but never so high that quiet speech is thrown away.
  const thr = Math.min(Math.max(0.012, floor * 2.5, peak * 0.15), peak * 0.35)
  let voiced = levels.map((l) => l > thr)

  // Close tiny gaps (consonants, breaths <= 300ms), then drop tiny blips (< 200ms).
  const runs = (arr) => {
    const out = []
    let s = 0
    for (let i = 1; i <= arr.length; i++) if (i === arr.length || arr[i] !== arr[s]) { out.push({ v: arr[s], s, e: i }); s = i }
    return out
  }
  for (const r of runs(voiced)) if (!r.v && r.s > 0 && r.e < voiced.length && r.e - r.s <= 3) for (let i = r.s; i < r.e; i++) voiced[i] = true
  for (const r of runs(voiced)) if (r.v && r.e - r.s < 2) for (let i = r.s; i < r.e; i++) voiced[i] = false

  const first = voiced.indexOf(true)
  const last = voiced.lastIndexOf(true)
  if (first === -1) return none
  const minRun = Math.round(pauseMs / stepMs)
  const pauses = runs(voiced).filter((r) => !r.v && r.s > first && r.e <= last && r.e - r.s >= minRun).length
  const voicedSec = (voiced.filter(Boolean).length * stepMs) / 1000
  return { totalSec, voicedSec, speakingSec: ((last - first + 1) * stepMs) / 1000, pauses, prolongations: countProlongations(levels, centroids, voiced) }
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

// Practice score (0-100). These weights are a simple heuristic, not a clinical measure.
export function computeScore({ pauses, repetitions, prolongations = 0, wpm, coverage: cov }) {
  let s = 100
  s -= Math.min(prolongations * 3, 15)
  s -= Math.min(pauses * 4, 24)
  s -= Math.min(repetitions * 5, 25)
  if (wpm > 0) {
    if (wpm > 170) s -= Math.min((wpm - 170) / 4, 15)
    else if (wpm < 70) s -= Math.min((70 - wpm) / 3, 10)
  }
  if (cov !== null && cov !== undefined && cov < 0.6) s -= Math.round((0.6 - cov) * 50)
  return clamp(Math.round(s), 20, 100)
}

// Puts everything together. Returns { ok:false } when there was not enough speech to judge.
export function analyzeRecording({ levels, centroids = null, stepMs = 100, transcript = '', phrases = [], pauseMs = 1200 }) {
  const a = analyzeLevels(levels, stepMs, pauseMs, centroids)
  if (a.voicedSec < 1.5) return { ok: false, reason: 'too_quiet', ...a }
  const tokens = tokenize(transcript)
  const hasText = tokens.length >= 2
  const wpm = hasText && a.speakingSec > 0 ? Math.round((tokens.length / a.speakingSec) * 60) : 0
  const repetitions = hasText ? countRepetitions(tokens) : 0
  const cov = hasText ? coverage(tokens, phrases) : null
  return {
    ok: true,
    duration: Math.round(a.totalSec),
    wpm,
    pauses: a.pauses,
    repetitions,
    prolongations: a.prolongations,
    coverage: cov,
    hasTranscript: hasText,
    score: computeScore({ pauses: a.pauses, repetitions, prolongations: a.prolongations, wpm, coverage: cov })
  }
}
