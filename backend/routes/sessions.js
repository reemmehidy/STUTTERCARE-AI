import express from "express";
import User from "../models/User.js";
import Session from "../models/Session.js";
import { protect, authorize } from "../middleware/auth.js";
import { canAccess } from "./patients.js";

const router = express.Router();
router.use(protect);

// الأخصائي يسجّل جلسة لمريض من مرضاه
router.post("/", authorize("therapist", "admin"), async (req, res) => {
  const { patientId, notes, score, date } = req.body ?? {};
  if (!/^[a-f\d]{24}$/i.test(String(patientId))) return res.status(404).json({ message: "Patient not found" });
  const patient = await User.findOne({ _id: patientId, role: "patient" });
  if (!patient) return res.status(404).json({ message: "Patient not found" });
  if (!canAccess(req.user, patient)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const session = await Session.create({
    patient: patient._id,
    therapist: patient.therapist || req.user._id,
    notes, score, date,
  });
  res.status(201).json(session);
});

// جلسات مريض (المريض نفسه، ولي أمره، أخصائيه)
router.get("/patient/:patientId", async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.patientId)) return res.status(404).json({ message: "Patient not found" });
  const patient = await User.findOne({ _id: req.params.patientId, role: "patient" });
  if (!patient) return res.status(404).json({ message: "Patient not found" });
  if (!canAccess(req.user, patient)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const sessions = await Session.find({ patient: patient._id })
    .populate("therapist", "name")
    .sort({ date: -1 });
  res.json(sessions);
});

export default router;