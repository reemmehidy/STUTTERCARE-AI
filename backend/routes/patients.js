import express from "express";
import User from "../models/User.js";
import Result from "../models/Result.js";
import { protect, authorize } from "../middleware/auth.js";
import crypto from "node:crypto";
import { rateLimit } from "../middleware/rateLimit.js";
import { str, normEmail, isEmail, passwordProblem, num } from "../utils/validate.js";

const router = express.Router();
router.use(protect);

// Who may see this patient?
export const canAccess = (user, patient) =>
  user.role === "admin" ||
  patient._id.equals(user._id) ||
  (user.role === "parent" && patient.parent?.equals(user._id)) ||
  (user.role === "therapist" && patient.therapist?.equals(user._id));

const validId = (id) => /^[a-f\d]{24}$/i.test(id);

// List by role, with a small progress summary for dashboards.
router.get("/", authorize("parent", "therapist", "admin"), async (req, res) => {
  const filter = { role: "patient" };
  if (req.user.role === "parent") filter.parent = req.user._id;
  if (req.user.role === "therapist") filter.therapist = req.user._id;

  const patients = await User.find(filter).populate("therapist", "name email").limit(500);
  const since = new Date(Date.now() - 7 * 864e5);
  const rows = await Result.find({ patient: { $in: patients.map((p) => p._id) } })
    .sort({ createdAt: 1 })
    .select("patient score createdAt");

  const by = new Map();
  for (const r of rows) {
    const k = String(r.patient);
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(r);
  }
  res.json(
    patients.map((p) => {
      const mine = by.get(String(p._id)) ?? [];
      const days = new Set(mine.filter((r) => r.createdAt >= since).map((r) => r.createdAt.toISOString().slice(0, 10)));
      return {
        id: p._id,
        name: p.name,
        email: p.email,
        track: p.track,
        age: p.age,
        stars: p.stars ?? 0,
        therapist: p.therapist ? { id: p.therapist._id, name: p.therapist.name } : null,
        sessions: mine.length,
        scores: mine.slice(-6).map((r) => r.score),
        adherence: Math.round((days.size / 7) * 100),
        lastActive: mine.at(-1)?.createdAt ?? null,
      };
    })
  );
});

// ---- Link codes: the patient shares a code, the parent or therapist enters it ----
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid typos
const newCode = () => Array.from({ length: 8 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join("");

async function ensureCode(user, force = false) {
  if (user.linkCode && !force) return user.linkCode;
  for (let i = 0; i < 5; i++) {
    user.linkCode = newCode();
    try { await user.save(); return user.linkCode; } catch (e) { if (e.code !== 11000) throw e; }
  }
  throw new Error("Could not create a code");
}

// My code (patients only). It can be regenerated if it was shared by mistake.
router.get("/me/link-code", authorize("patient"), async (req, res) => {
  res.json({ code: await ensureCode(req.user), hasTherapist: !!req.user.therapist, hasParent: !!req.user.parent });
});
router.post("/me/link-code/reset", authorize("patient"), async (req, res) => {
  res.json({ code: await ensureCode(req.user, true) });
});

// Parent or therapist enters the code to follow that patient.
router.post("/link", authorize("parent", "therapist"), rateLimit({ windowMs: 15 * 60_000, max: 10, key: (r) => `link:${r.user._id}` }), async (req, res) => {
  const code = str(req.body?.code, 12).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== 8) return res.status(400).json({ message: "Enter the 8-character code." });
  const patient = await User.findOne({ linkCode: code, role: "patient" });
  if (!patient) return res.status(404).json({ message: "This code was not found. Check it and try again." });

  const field = req.user.role === "parent" ? "parent" : "therapist";
  if (patient[field] && !patient[field].equals(req.user._id)) {
    return res.status(409).json({ message: "This patient is already linked to another account of this type." });
  }
  patient[field] = req.user._id;
  await patient.save();
  res.json({ message: "Linked", patient: { id: patient._id, name: patient.name } });
});

// A patient can remove a link at any time.
router.delete("/me/link/:who", authorize("patient"), async (req, res) => {
  if (!["parent", "therapist"].includes(req.params.who)) return res.status(400).json({ message: "Invalid link type." });
  req.user[req.params.who] = null;
  await req.user.save();
  res.json({ message: "Link removed" });
});

// One patient.
router.get("/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: "Patient not found" });
  const patient = await User.findOne({ _id: req.params.id, role: "patient" })
    .populate("therapist", "name email")
    .populate("parent", "name email");
  if (!patient) return res.status(404).json({ message: "Patient not found" });
  if (!canAccess(req.user, patient)) return res.status(403).json({ message: "Forbidden" });
  res.json(patient);
});

// A parent creates an account for their child (child account is verified by the parent's access).
router.post("/", authorize("parent"), async (req, res) => {
  const b = req.body ?? {};
  const name = str(b.name, 80);
  const email = normEmail(b.email);
  const password = typeof b.password === "string" ? b.password : "";
  const age = num(b.age, 1, 18);
  const fields = {};
  if (name.length < 2) fields.name = "Enter the child's name.";
  if (!isEmail(email)) fields.email = "Enter a valid email address.";
  const pw = passwordProblem(password);
  if (pw) fields.password = pw;
  if (Object.keys(fields).length) return res.status(400).json({ message: "Please fix the highlighted fields.", fields });
  if (await User.findOne({ email })) return res.status(409).json({ message: "This email is already registered." });

  const child = await User.create({
    name, email, password, age: age ?? undefined,
    role: "patient", track: "kids", parent: req.user._id,
    emailVerified: true, // created by a verified parent
  });
  res.status(201).json({ id: child._id, name: child.name, email: child.email });
});

// Link a patient to a therapist (by the therapist's email).
router.put("/:id/therapist", authorize("parent", "patient", "admin"), async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: "Patient not found" });
  const patient = await User.findOne({ _id: req.params.id, role: "patient" });
  if (!patient) return res.status(404).json({ message: "Patient not found" });
  if (!canAccess(req.user, patient)) return res.status(403).json({ message: "Forbidden" });

  const email = normEmail(req.body?.therapistEmail);
  const therapist = isEmail(email) ? await User.findOne({ email, role: "therapist", emailVerified: true }) : null;
  if (!therapist) return res.status(400).json({ message: "No therapist account found with this email." });

  patient.therapist = therapist._id;
  await patient.save();
  res.json({ message: "Therapist linked", therapist: { id: therapist._id, name: therapist.name } });
});

export default router;
