import express from "express";
import User from "../models/User.js";
import Result from "../models/Result.js";
import { protect, authorize } from "../middleware/auth.js";
import { num } from "../utils/validate.js";

const router = express.Router();
router.use(protect, authorize("admin"));

const daysAgo = (n) => new Date(Date.now() - n * 864e5);

// Who is using the app.
router.get("/stats", async (_req, res) => {
  const [total, verified, byRole, byTrack, new7, new30, active7, active30, premium, sessions, signups, recent] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ emailVerified: true }),
    User.aggregate([{ $group: { _id: "$role", n: { $sum: 1 } } }]),
    User.aggregate([{ $match: { role: "patient" } }, { $group: { _id: "$track", n: { $sum: 1 } } }]),
    User.countDocuments({ createdAt: { $gte: daysAgo(7) } }),
    User.countDocuments({ createdAt: { $gte: daysAgo(30) } }),
    User.countDocuments({ lastSeenAt: { $gte: daysAgo(7) } }),
    User.countDocuments({ lastSeenAt: { $gte: daysAgo(30) } }),
    User.countDocuments({ plan: "premium", premiumUntil: { $gt: new Date() } }),
    Result.countDocuments(),
    User.aggregate([
      { $match: { createdAt: { $gte: daysAgo(14) } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    User.find().sort({ createdAt: -1 }).limit(50).select("name email role track emailVerified plan premiumUntil createdAt lastSeenAt"),
  ]);
  res.json({
    total, verified, new7, new30, active7, active30, premium, sessions,
    byRole: Object.fromEntries(byRole.map((r) => [r._id, r.n])),
    byTrack: Object.fromEntries(byTrack.map((r) => [r._id ?? "none", r.n])),
    signups,
    recent: recent.map((u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, track: u.track, verified: u.emailVerified, plan: u.plan, premiumUntil: u.premiumUntil, createdAt: u.createdAt, lastSeenAt: u.lastSeenAt })),
  });
});

// Manual premium activation (for example after an InstaPay / Vodafone Cash payment).
router.put("/users/:id/premium", async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(404).json({ message: "User not found" });
  const days = num(req.body?.days, 0, 3660);
  if (days === null) return res.status(400).json({ message: "Enter days between 0 and 3660." });
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ message: "User not found" });
  if (days === 0) { u.plan = "free"; u.premiumUntil = undefined; }
  else {
    const start = u.premiumUntil && u.premiumUntil > new Date() ? u.premiumUntil : new Date();
    u.plan = "premium";
    u.premiumUntil = new Date(start.getTime() + days * 864e5);
  }
  await u.save();
  res.json({ id: u._id, plan: u.plan, premiumUntil: u.premiumUntil ?? null });
});

export default router;
