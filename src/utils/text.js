// Text helpers shared by the coach and the recording analysis (English + Arabic).
const AR_MARKS = /[\u064B-\u065F\u0670\u0640]/g // tashkeel + tatweel

// Arabic recognizers spell the same word in several ways; fold them together.
export function normalizeArabic(s) {
  return s.replace(AR_MARKS, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
}

// Lower-cased word list from any English/Arabic text.
export function words(text) {
  return normalizeArabic(String(text || '').toLowerCase()).replace(/[^a-z\u0621-\u064A'\s-]/g, ' ').split(/[\s-]+/).filter(Boolean)
}

export function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

// Same word, allowing one letter of recognizer noise on longer words.
export const near = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && levenshtein(a, b) <= 1)
