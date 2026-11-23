// Decides, in plain code, whether an attempt matches the target word (English or Arabic).
// The recognizer only supplies text; this file makes the judgement, so the coach can
// never answer "I did not understand" and always knows what to do next.
import { words, levenshtein } from './text.js'
export { levenshtein }

const FILLER = new Set([
  'the', 'word', 'is', 'it', 'its', 'says', 'i', 'said', 'say', 'this', 'right', 'um', 'uh', 'okay', 'ok', 'so', 'then', 'a',
  'الكلمه', 'كلمه', 'هي', 'هو', 'قلت', 'انا', 'صح', 'ايوه', 'طب', 'طيب', 'ده', 'دي', 'كده', 'يعني'
])

export const normalize = (text) => words(text).filter((w) => !FILLER.has(w))

// Are all target words present, in order?
const containsInOrder = (list, target) => {
  let i = 0
  for (const w of list) if (w === target[i]) i++
  return i === target.length
}

// alternatives: the recognizer's guesses (strings or {text}). Returns { status, heard }
// status: 'correct' | 'close' | 'wrong' | 'silence'
export function evaluateAttempt(alternatives, targetText) {
  const list = (Array.isArray(alternatives) ? alternatives : [alternatives]).map((a) => (typeof a === 'string' ? a : a?.text)).filter(Boolean)
  const n = normalize(targetText)
  const target = n.length ? n : words(targetText)
  const heardSets = list.map(normalize).filter((w) => w.length)
  if (!heardSets.length) return { status: 'silence', heard: '' }

  // Any recognizer guess that contains the target counts (helps with accents and stuttered starts).
  if (heardSets.some((w) => containsInOrder(w, target))) return { status: 'correct', heard: target.join(' ') }

  const heard = heardSets[0].join(' ')
  const flat = target.join(' ')
  const candidates = heardSets.flatMap((w) => [w.join(' '), ...w])
  const best = Math.min(...candidates.map((c) => levenshtein(c, flat)))
  const limit = flat.length <= 4 ? 1 : 2
  return { status: best <= limit ? 'close' : 'wrong', heard }
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const EN = {
  intro: (w) => pick([`Our word is "${w}". Take your time.`, `Let's try "${w}". Breathe in, and start softly.`, `Ready? The word is "${w}".`]),
  correctFirst: (w) => pick([`Perfect! You said "${w}" really well.`, `Yes! "${w}" - that was smooth.`, `Great job! "${w}" came out nicely.`]),
  correctDrill: (n, total, w) => `Yes! That's ${n} of ${total}. Again: "${w}".`,
  drillDone: (w, total) => pick([`Wonderful! You said "${w}" ${total} times in a row.`, `That's it! ${total} in a row. Your voice is getting steady.`]),
  close: (heard, w) => `Almost! I heard "${heard}". The word is "${w}". Listen to me, then say it with me.`,
  wrong: (heard, w) => `Good try! I heard "${heard}", but our word is "${w}". Listen carefully, then repeat after me.`,
  repeatAfter: (w) => pick([`Now you. Say: "${w}".`, `Repeat after me: "${w}".`, `Your turn: "${w}".`]),
  slower: (w) => `No problem. Take a slow breath. Let the sound start softly: "${w}".`,
  silence: (w) => pick([`Take your time. Say: "${w}".`, `I'm listening. Whenever you're ready: "${w}".`]),
  idle: `I'll wait here. Tap "Talk to Arkan" when you're ready.`,
  skip: `That one is tricky today, and that is okay. Let's try a different word and come back to it later.`
}

const AR = {
  intro: (w) => pick([`كلمتنا هي "${w}". خد وقتك.`, `يلا نجرب "${w}". خد نفس هادي وابدأ بلطف.`, `جاهز؟ الكلمة هي "${w}".`]),
  correctFirst: (w) => pick([`ممتاز! قلت "${w}" بشكل رائع.`, `أحسنت! "${w}" طلعت سلسة.`, `برافو! "${w}" طلعت حلوة.`]),
  correctDrill: (n, total, w) => `أحسنت! دي ${n} من ${total}. كمان مرة: "${w}".`,
  drillDone: (w, total) => pick([`رائع! قلت "${w}" ${total} مرات ورا بعض.`, `كده تمام! ${total} مرات ورا بعض. صوتك بقى أثبت.`]),
  close: (heard, w) => `قربت! سمعتك بتقول "${heard}". الكلمة هي "${w}". اسمعني وبعدين قولها معايا.`,
  wrong: (heard, w) => `محاولة حلوة! سمعتك بتقول "${heard}"، لكن كلمتنا هي "${w}". اسمعني كويس وبعدين كرر ورايا.`,
  repeatAfter: (w) => pick([`دورك دلوقتي. قول: "${w}".`, `كرر ورايا: "${w}".`, `جاء دورك: "${w}".`]),
  slower: (w) => `ولا يهمك. خد نفس بطيء. وابدأ الصوت بهدوء: "${w}".`,
  silence: (w) => pick([`خد وقتك. قول: "${w}".`, `أنا سامعك. وقت ما تكون جاهز: "${w}".`]),
  idle: `هستنى هنا. اضغط "كلم أركان" لما تكون جاهز.`,
  skip: `الكلمة دي صعبة النهارده، وده عادي. يلا نجرب كلمة تانية ونرجع لها بعدين.`
}

// Adds the person's name. Kids get their pet name often and warmly; adults get their first
// name only now and then, so it never feels forced.
export function personalize(text, { name, kid, lang, rand = Math.random }) {
  const n = String(name || '').trim()
  if (!n || rand() > (kid ? 0.7 : 0.25)) return text
  const first = kid ? n : n.split(/\s+/)[0]
  if (lang === 'ar') return rand() < 0.5 ? `يا ${first}، ${text}` : `${text} ${kid ? 'يا ' + first + '!' : '(' + first + ')'}`.replace('()', '')
  return rand() < 0.5 ? `${first}, ${text.charAt(0).toLowerCase()}${text.slice(1)}` : `${text} ${kid ? first + '!' : ''}`.trim()
}

export const sayFor = (lang) => (lang === 'ar' ? AR : EN)
export const say = EN // English default (kept for tests and simple imports)

export const DRILL_TARGET = 3

export const WORDS = {
  en: {
    kids: ['cat', 'car', 'sun', 'moon', 'apple', 'banana', 'rabbit', 'puppy', 'train', 'rainbow', 'butterfly', 'elephant', 'ball', 'fish', 'tree', 'star', 'milk', 'bird', 'book', 'flower'],
    adults: ['able', 'call', 'table', 'coffee', 'water', 'morning', 'please', 'appointment', 'thank you', 'good morning', 'my name is', 'excuse me', 'tomorrow', 'meeting', 'question', 'important', 'how much', 'I agree']
  },
  ar: {
    kids: ['قطة', 'سيارة', 'شمس', 'قمر', 'تفاحة', 'موزة', 'أرنب', 'كلب', 'قطار', 'وردة', 'فراشة', 'فيل', 'كورة', 'سمكة', 'شجرة', 'نجمة', 'لبن', 'عصفور', 'كتاب', 'بطة'],
    adults: ['صباح الخير', 'من فضلك', 'شكرا', 'ماء', 'قهوة', 'موعد', 'اجتماع', 'سؤال', 'مهم', 'بكام ده', 'اسمي', 'لو سمحت', 'بكرة', 'محتاج مساعدة', 'أوافق', 'مرحبا']
  }
}

// Score for one finished word: fewer misses = higher.
export const wordScore = (misses, skipped) => Math.max(skipped ? 30 : 40, 100 - misses * 12)
