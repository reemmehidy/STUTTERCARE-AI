import express from "express";
import User from "../models/User.js";
import Result from "../models/Result.js";
import { protect, authorize } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { canAccess } from "./patients.js";
import { num, str } from "../utils/validate.js";

const router = express.Router();
router.use(protect);

const out = (r) => ({
  id: r._id,
  kind: r.kind,
  exerciseId: r.exerciseId,
  score: r.score,
  wpm: r.wpm,
  pauses: r.pauses,
  repetitions: r.repetitions,
  prolongations: r.prolongations,
  duration: r.duration,
  word: r.word,
  attempts: r.attempts,
  measured: r.measured,
  date: r.createdAt,
});

// The signed-in patient saves a finished attempt.
router.post("/", authorize("patient"), rateLimit({ windowMs: 60_000, max: 60 }), async (req, res) => {
  const b = req.body ?? {};
  const score = num(b.score, 0, 100);
  const exerciseId = str(b.exerciseId, 60);
  if (score === null || !exerciseId) return res.status(400).json({ message: "exerciseId and score (0-100) are required." });

  const result = await Result.create({
    patient: req.user._id,
    kind: ["exercise", "coach", "game", "simulation"].includes(b.kind) ? b.kind : "exercise",
    exerciseId,
    score: Math.round(score),
    wpm: num(b.wpm, 0, 400) ?? 0,
    pauses: num(b.pauses, 0, 200) ?? 0,
    repetitions: num(b.repetitions, 0, 200) ?? 0,
    prolongations: num(b.prolongations, 0, 200) ?? 0,
    duration: num(b.duration, 0, 3600) ?? 0,
    word: b.word ? str(b.word, 60) : undefined,
    attempts: num(b.attempts, 0, 100) ?? undefined,
    measured: b.measured === true,
  });

  // Kids earn stars on the server so the count cannot be edited from the browser.
  let earned = 0;
  if (req.user.track === "kids") {
    earned = score >= 60 ? 3 : 2;
    req.user.stars = (req.user.stars || 0) + earned;
    await req.user.save();
  }
  res.status(201).json({ result: out(result), earned, stars: req.user.stars ?? 0 });
});

// Games: small star rewards (capped per request and rate limited).
router.post("/stars", authorize("patient"), rateLimit({ windowMs: 60_000, max: 40 }), async (req, res) => {
  if (req.user.track !== "kids") return res.status(400).json({ message: "Stars are for the kids track." });
  const n = Math.round(num(req.body?.amount, 1, 5) ?? 1);
  req.user.stars = (req.user.stars || 0) + n;
  await req.user.save();
  res.json({ stars: req.user.stars });
});

// My history (oldest -> newest, last 300).
router.get("/mine", authorize("patient"), async (req, res) => {
  const rows = await Result.find({ patient: req.user._id }).sort({ createdAt: -1 }).limit(300);
  res.json({ results: rows.reverse().map(out), stars: req.user.stars ?? 0 });
});

// A patient's history for the parent / therapist / admin who may access them.
router.get("/patient/:id", async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(404).json({ message: "Patient not found" });
  const patient = await User.findOne({ _id: req.params.id, role: "patient" });
  if (!patient) return res.status(404).json({ message: "Patient not found" });
  if (!canAccess(req.user, patient)) return res.status(403).json({ message: "Forbidden" });
  const rows = await Result.find({ patient: patient._id }).sort({ createdAt: -1 }).limit(300);
  res.json({ patient: { id: patient._id, name: patient.name, track: patient.track, age: patient.age, stars: patient.stars ?? 0 }, results: rows.reverse().map(out) });
});

export default router;
