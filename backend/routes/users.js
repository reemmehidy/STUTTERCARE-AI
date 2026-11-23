import express from "express";
import User from "../models/User.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();
router.use(protect, authorize("admin"));

// قايمة المستخدمين (اختياري: ?role=therapist)
router.get("/", async (req, res) => {
  const filter = typeof req.query.role === "string" && req.query.role ? { role: req.query.role } : {};
  res.json(await User.find(filter).select("-password"));
});

export default router;