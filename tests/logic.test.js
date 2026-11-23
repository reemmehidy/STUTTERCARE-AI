import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateAttempt, normalize, wordScore } from '../src/utils/coachLogic.js'
import { analyzeLevels, analyzeRecording, countRepetitions, tokenize } from '../src/utils/analyzeSpeech.js'

test('coach: the bug from the screenshot - "apple" must NOT count as "car"', () => {
  assert.equal(evaluateAttempt(['the word is apple is this right'], 'car').status, 'wrong')
  assert.equal(evaluateAttempt(['the word is apple is this right'], 'able').status, 'wrong')
})
test('coach: correct with filler words and punctuation', () => {
  assert.equal(evaluateAttempt(['The word is car.'], 'car').status, 'correct')
  assert.equal(evaluateAttempt(['c c car'], 'car').status, 'correct')
  assert.equal(evaluateAttempt(['Car'], 'Car').status, 'correct')
})
test('coach: any alternative may match', () => {
  assert.equal(evaluateAttempt([{ text: 'call' }, { text: 'car' }], 'car').status, 'correct')
})
test('coach: "call" for "car" is wrong, "cars" is close, empty is silence', () => {
  assert.equal(evaluateAttempt(['call'], 'car').status, 'wrong')
  assert.equal(evaluateAttempt(['cars'], 'car').status, 'close')
  assert.equal(evaluateAttempt([''], 'car').status, 'silence')
  assert.equal(evaluateAttempt([], 'car').status, 'silence')
})
test('coach: phrases need every word in order', () => {
  assert.equal(evaluateAttempt(['thank you'], 'thank you').status, 'correct')
  assert.notEqual(evaluateAttempt(['you thank'], 'thank you').status, 'correct')
})
test('coach: scoring', () => {
  assert.equal(wordScore(0), 100)
  assert.equal(wordScore(3), 64)
  assert.equal(wordScore(20), 40)
})

const quiet = (n) => Array(n).fill(0.003)
const talk = (n) => Array.from({ length: n }, (_, i) => 0.2 + 0.1 * Math.sin(i))
test('audio: silence gives no speech', () => {
  assert.equal(analyzeRecording({ levels: quiet(100) }).ok, false)
})
test('audio: continuous speech has no pauses', () => {
  const a = analyzeLevels([...quiet(10), ...talk(80), ...quiet(10)])
  assert.equal(a.pauses, 0)
  assert.ok(a.voicedSec > 7)
})
test('audio: a 2 second gap in the middle is one pause; leading/trailing silence is not', () => {
  const a = analyzeLevels([...quiet(30), ...talk(40), ...quiet(20), ...talk(40), ...quiet(30)])
  assert.equal(a.pauses, 1)
})
test('audio: short breath gaps are not pauses', () => {
  const a = analyzeLevels([...talk(40), ...quiet(2), ...talk(40)])
  assert.equal(a.pauses, 0)
})
test('transcript: repetitions and rate', () => {
  assert.equal(countRepetitions(tokenize('I I want to go go home')), 2)
  assert.equal(countRepetitions(tokenize('b b ball')), 1)
  assert.equal(countRepetitions(tokenize('a apple and an egg')), 0)
})
test('full analysis is deterministic and bounded', () => {
  const levels = [...quiet(10), ...talk(60), ...quiet(15), ...talk(60), ...quiet(10)]
  const args = { levels, transcript: 'my my name is omar and I would like some water', phrases: ['My name is', 'I would like some water'] }
  const r1 = analyzeRecording(args), r2 = analyzeRecording(args)
  assert.deepEqual(r1, r2)
  assert.ok(r1.ok && r1.score >= 20 && r1.score <= 100)
  assert.equal(r1.repetitions, 1)
  assert.equal(r1.pauses, 1)
  assert.equal(r1.coverage, 1)
})
test('normalize drops filler', () => assert.deepEqual(normalize('The word is Car!'), ['car']))

import { sayFor, WORDS } from '../src/utils/coachLogic.js'
import { normalizeArabic } from '../src/utils/text.js'
test('arabic: spelling variants of the same word match', () => {
  assert.equal(evaluateAttempt(['سيّارة'], 'سيارة').status, 'correct')
  assert.equal(evaluateAttempt(['الكلمة هي تفاحه'], 'تفاحة').status, 'correct')
  assert.equal(evaluateAttempt(['أرنب'], 'ارنب').status, 'correct')
})
test('arabic: a different word is wrong, empty is silence', () => {
  assert.equal(evaluateAttempt(['قمر'], 'سيارة').status, 'wrong')
  assert.equal(evaluateAttempt([''], 'سيارة').status, 'silence')
})
test('arabic: phrases in order', () => {
  assert.equal(evaluateAttempt(['صباح الخير'], 'صباح الخير').status, 'correct')
  assert.equal(evaluateAttempt(['شكرا لك'], 'شكرا').status, 'correct')
})
test('arabic analysis: repetitions and coverage', () => {
  const r = analyzeRecording({ levels: [...quiet(10), ...talk(80), ...quiet(10)], transcript: 'انا انا عايز ماء بارد', phrases: ['عايز ماء بارد'] })
  assert.equal(r.repetitions, 1)
  assert.equal(r.coverage, 1)
})
test('arabic messages exist for every English coach line', () => {
  const en = sayFor('en'), ar = sayFor('ar')
  assert.deepEqual(Object.keys(ar).sort(), Object.keys(en).sort())
  assert.ok(/[\u0600-\u06FF]/.test(ar.intro('سيارة')))
})
test('word lists are big enough in both languages', () => {
  for (const l of ['en', 'ar']) for (const k of ['kids', 'adults']) assert.ok(WORDS[l][k].length >= 16)
})
test('normalizeArabic', () => assert.equal(normalizeArabic('مَدْرَسَةٌ'), 'مدرسه'))

import { personalize } from '../src/utils/coachLogic.js'
test('personalize: kids hear their nickname, adults only sometimes, empty name is ignored', () => {
  assert.match(personalize('Great job!', { name: 'Lulu', kid: true, lang: 'en', rand: () => 0.1 }), /Lulu/)
  assert.match(personalize('أحسنت!', { name: 'لولو', kid: true, lang: 'ar', rand: () => 0.1 }), /لولو/)
  assert.equal(personalize('Great job!', { name: 'Omar Ali', kid: false, lang: 'en', rand: () => 0.9 }), 'Great job!')
  assert.equal(personalize('Great job!', { name: '', kid: true, lang: 'en', rand: () => 0 }), 'Great job!')
  assert.ok(!personalize('Great job!', { name: 'Omar Ali', kid: false, lang: 'en', rand: () => 0.1 }).includes('Ali'))
})

test('audio: a sound held steady for 1 second is one possible prolongation; normal speech is not', () => {
  const lv = [...quiet(10), ...talk(60), ...quiet(10)]
  // varying spectrum (normal speech)
  const varying = lv.map((_, i) => 1500 + 400 * Math.sin(i * 1.3))
  assert.equal(analyzeLevels(lv, 100, 1200, varying).prolongations, 0)
  // 12 frames with an almost constant spectrum in the middle
  const held = varying.map((c, i) => (i >= 30 && i < 42 ? 1800 + i * 0.5 : c))
  assert.equal(analyzeLevels(lv, 100, 1200, held).prolongations, 1)
})
test('analysis reports prolongations and lowers the score for them', () => {
  const lv = [...quiet(10), ...talk(80), ...quiet(10)]
  const held = lv.map((_, i) => (i >= 20 && i < 35 ? 2000 : 1500 + 500 * Math.sin(i * 1.7)))
  const base = analyzeRecording({ levels: lv, centroids: lv.map((_, i) => 1500 + 500 * Math.sin(i * 1.7)) })
  const withHeld = analyzeRecording({ levels: lv, centroids: held })
  assert.equal(withHeld.prolongations, 1)
  assert.ok(withHeld.score < base.score)
})
