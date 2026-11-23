import express from "express";
import User from "../models/User.js";
import Plan from "../models/Plan.js";
import Feedback from "../models/Feedback.js";
import { protect, authorize } from "../middleware/auth.js";
import { canAccess } from "./patients.js";
import { str } from "../utils/validate.js";

const router = express.Router();
router.use(protect);

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const validId = (id) => /^[a-f\d]{24}$/i.test(id);

const cleanDays = (input) => {
  const out = {};
  for (const d of DAYS) {
    const list = Array.isArray(input?.[d]) ? input[d] : [];
    out[d] = [...new Set(list.map((x) => str(x, 60)).filter(Boolean))].slice(0, 12);
  }
  return out;
};
const shape = (p) => (p ? { plan: p.days, note: p.note, updatedAt: p.updatedAt } : { plan: null, note: "" });

// My plan (patient).
router.get("/mine", authorize("patient"), async (req, res) => {
  res.json(shape(await Plan.findOne({ patient: req.user._id })));
});

// Notes written for me (patient).
router.get("/feedback/mine", authorize("patient"), async (req, res) => {
  const rows = await Feedback.find({ patient: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json(rows.map((f) => ({ id: f._id, from: f.fromName, text: f.text, date: f.createdAt })));
});

async function loadPatient(req, res) {
  if (!validId(req.params.id)) { res.status(404).json({ message: "Patient not found" }); return null; }
  const patient = await User.findOne({ _id: req.params.id, role: "patient" });
  if (!patient) { res.status(404).json({ message: "Patient not found" }); return null; }
  if (!canAccess(req.user, patient)) { res.status(403).json({ message: "Forbidden" }); return null; }
  return patient;
}

// A patient's plan for their parent / therapist.
router.get("/patient/:id", async (req, res) => {
  const patient = await loadPatient(req, res);
  if (patient) res.json(shape(await Plan.findOne({ patient: patient._id })));
});

// Therapist saves the plan; a changed note is also sent to the patient as feedback.
router.put("/patient/:id", authorize("therapist", "admin"), async (req, res) => {
  const patient = await loadPatient(req, res);
  if (!patient) return;
  const note = str(req.body?.note, 1000);
  const prev = await Plan.findOne({ patient: patient._id });
  const plan = await Plan.findOneAndUpdate(
    { patient: patient._id },
    { patient: patient._id, therapist: req.user._id, days: cleanDays(req.body?.plan), note },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  if (note && note !== (prev?.note ?? "")) {
    await Feedback.create({ patient: patient._id, from: req.user._id, fromName: req.user.name, text: note });
  }
  res.json(shape(plan));
});

export default router;
