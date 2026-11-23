import express from "express";
import User from "../models/User.js";
import Checkin from "../models/Checkin.js";
import { protect, authorize, requirePremium } from "../middleware/auth.js";
import { canAccess } from "./patients.js";
import { num, str } from "../utils/validate.js";

const router = express.Router();
router.use(protect);

const SITUATIONS = ["phone", "meeting", "shopping", "family", "work", "social", "other"];
const out = (c) => ({ id: c._id, situation: c.situation, difficulty: c.difficulty, control: c.control, note: c.note, date: c.createdAt });

router.post("/", authorize("patient"), requirePremium, async (req, res) => {
  const b = req.body ?? {};
  const difficulty = num(b.difficulty, 1, 5), control = num(b.control, 1, 5);
  if (!SITUATIONS.includes(b.situation) || difficulty === null || control === null) {
    return res.status(400).json({ message: "Choose a situation and rate it from 1 to 5." });
  }
  const c = await Checkin.create({ patient: req.user._id, situation: b.situation, difficulty: Math.round(difficulty), control: Math.round(control), note: b.note ? str(b.note, 300) : undefined });
  res.status(201).json(out(c));
});

router.get("/mine", authorize("patient"), requirePremium, async (req, res) => {
  const rows = await Checkin.find({ patient: req.user._id }).sort({ createdAt: -1 }).limit(200);
  res.json(rows.reverse().map(out));
});

// For the linked therapist / parent.
router.get("/patient/:id", async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(404).json({ message: "Patient not found" });
  const patient = await User.findOne({ _id: req.params.id, role: "patient" });
  if (!patient) return res.status(404).json({ message: "Patient not found" });
  if (!canAccess(req.user, patient)) return res.status(403).json({ message: "Forbidden" });
  const rows = await Checkin.find({ patient: patient._id }).sort({ createdAt: -1 }).limit(200);
  res.json(rows.reverse().map(out));
});

export default router;
