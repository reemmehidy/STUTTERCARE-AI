import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { protect, makeToken, isPremium } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { sendOtpEmail } from "../utils/mailer.js";
import { applyNewOtp, canSendOtp, checkOtp, clearOtp, isOtpFormat, OTP_RESEND_COOLDOWN_MS } from "../utils/otp.js";
import { config } from "../config.js";
import Result from "../models/Result.js";
import Plan from "../models/Plan.js";
import Feedback from "../models/Feedback.js";
import Checkin from "../models/Checkin.js";
import { str, normEmail, isEmail, passwordProblem, num } from "../utils/validate.js";

const router = express.Router();
const RESEND_IN = OTP_RESEND_COOLDOWN_MS / 1000;
const byIp = (n, windowMs = 15 * 60 * 1000) => rateLimit({ windowMs, max: n });
const byEmail = (n, windowMs = 15 * 60 * 1000) =>
  rateLimit({ windowMs, max: n, key: (req) => `${req.path}:${normEmail(req.body?.email) || req.ip}` });

export const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  track: u.track,
  age: u.age,
  stars: u.stars ?? 0,
  profile: u.profile ?? {},
  hasTherapist: !!u.therapist,
  hasParent: !!u.parent,
  premium: isPremium(u),
  premiumUntil: u.premiumUntil ?? null,
});

// Creates + emails a code. Always saves the document. Returns { sent, retryAfter?, failed? }.
async function sendCode(user, purpose) {
  const gate = canSendOtp(user);
  if (!gate.ok) {
    await user.save();
    return { sent: false, retryAfter: gate.retryAfter };
  }
  const otp = applyNewOtp(user, purpose);
  await user.save();
  try {
    await sendOtpEmail({ to: user.email, name: user.name, otp, purpose });
    return { sent: true };
  } catch (err) {
    console.error("MAIL ERROR:", err.message);
    user.otpSentAt = undefined; // let the person retry right away
    await user.save();
    return { sent: false, failed: true };
  }
}

const otpError = (res, r) => {
  const map = {
    wrong: [400, "OTP_INVALID", `Incorrect code. ${r.attemptsLeft} attempt(s) left.`],
    expired: [400, "OTP_EXPIRED", "This code has expired. Request a new one."],
    no_code: [400, "OTP_EXPIRED", "No active code. Request a new one."],
    locked: [429, "OTP_LOCKED", "Too many wrong attempts. Request a new code."],
  }[r.reason];
  return res.status(map[0]).json({ code: map[1], message: map[2], attemptsLeft: r.attemptsLeft });
};

// ---------- Register: creates an UNVERIFIED account and emails a code ----------
router.post("/register", byIp(10), async (req, res) => {
  const b = req.body ?? {};
  const name = str(b.name, 80);
  const email = normEmail(b.email);
  const password = typeof b.password === "string" ? b.password : "";
  const role = b.role ?? "patient";
  const track = ["kids", "adults"].includes(b.track) ? b.track : undefined;
  const age = b.age === undefined || b.age === "" ? undefined : num(b.age, 1, 120);

  const fields = {};
  if (name.length < 2) fields.name = "Enter your full name.";
  if (!isEmail(email)) fields.email = "Enter a valid email address.";
  const pw = passwordProblem(password);
  if (pw) fields.password = pw;
  if (!["patient", "parent", "therapist"].includes(role)) fields.role = "Invalid account type.";
  if (b.consent !== true) fields.consent = "Please accept the privacy policy to continue.";
  if (Object.keys(fields).length) return res.status(400).json({ message: "Please fix the highlighted fields.", fields });

  let user = await User.findOne({ email }).select("+otpHash");
  if (user?.emailVerified) {
    return res.status(409).json({ code: "EMAIL_EXISTS", message: "This email is already registered. Please log in." });
  }
  if (!user) user = new User({ email });
  Object.assign(user, { name, password, role, track, age, consentAt: new Date() });

  const r = await sendCode(user, "verify");
  if (r.failed) {
    return res.status(502).json({ code: "EMAIL_SEND_FAILED", message: "We could not send the verification email. Check the address and try again.", email });
  }
  res.status(201).json({ needsVerification: true, email, resendIn: r.retryAfter ?? RESEND_IN });
});

// ---------- Verify email with the code -> logs the person in ----------
router.post("/verify-email", byIp(30), byEmail(10), async (req, res) => {
  const email = normEmail(req.body?.email);
  const otp = str(req.body?.otp, 12);
  if (!isEmail(email) || !isOtpFormat(otp)) {
    return res.status(400).json({ code: "OTP_INVALID", message: "Enter the 6-digit code." });
  }
  const user = await User.findOne({ email }).select("+otpHash");
  if (!user) return res.status(400).json({ code: "OTP_INVALID", message: "Incorrect or expired code." });

  const r = checkOtp(user, otp, "verify");
  if (r.ok) {
    if (!user.emailVerified && config.trialDays > 0) {
      user.plan = "premium"; // free trial of premium features for new accounts
      user.premiumUntil = new Date(Date.now() + config.trialDays * 864e5);
    }
    user.emailVerified = true;
    user.lastLoginAt = new Date();
  }
  await user.save();
  if (!r.ok) return otpError(res, r);
  res.json({ token: makeToken(user._id), user: publicUser(user) });
});

// ---------- Resend code (same answer whether or not the account exists) ----------
router.post("/resend-otp", byIp(20), byEmail(6), async (req, res) => {
  const email = normEmail(req.body?.email);
  const purpose = req.body?.purpose === "reset" ? "reset" : "verify";
  if (!isEmail(email)) return res.status(400).json({ message: "Enter a valid email address." });

  const user = await User.findOne({ email }).select("+otpHash");
  let retryAfter = RESEND_IN;
  if (user && (purpose === "reset" ? user.emailVerified : !user.emailVerified)) {
    const r = await sendCode(user, purpose);
    if (r.retryAfter) retryAfter = r.retryAfter;
  }
  res.json({ message: "If the account exists, a new code was sent.", resendIn: retryAfter });
});

// Real bcrypt hash used to keep login timing the same for unknown emails.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

// ---------- Login ----------
router.post("/login", byIp(30), byEmail(10), async (req, res) => {
  const email = normEmail(req.body?.email);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!isEmail(email) || !password) return res.status(400).json({ message: "Email and password are required." });

  const user = await User.findOne({ email }).select("+password +otpHash");
  const okPw = user ? await user.matchPassword(password) : (await bcrypt.compare(password, DUMMY_HASH), false);
  if (!user || !okPw) return res.status(401).json({ message: "Invalid email or password." });

  if (!user.emailVerified) {
    const r = await sendCode(user, "verify");
    return res.status(403).json({
      code: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email. We sent you a new code.",
      email,
      resendIn: r.retryAfter ?? RESEND_IN,
    });
  }
  user.lastLoginAt = new Date();
  await user.save();
  res.json({ token: makeToken(user._id), user: publicUser(user) });
});

// ---------- Forgot / reset password (OTP) ----------
router.post("/forgot-password", byIp(10), byEmail(5), async (req, res) => {
  const email = normEmail(req.body?.email);
  if (!isEmail(email)) return res.status(400).json({ message: "Enter a valid email address." });
  const user = await User.findOne({ email }).select("+otpHash");
  if (user?.emailVerified) await sendCode(user, "reset");
  res.json({ message: "If that email is registered, we sent a reset code.", resendIn: RESEND_IN });
});

router.post("/reset-password", byIp(20), byEmail(10), async (req, res) => {
  const email = normEmail(req.body?.email);
  const otp = str(req.body?.otp, 12);
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
  if (!isEmail(email) || !isOtpFormat(otp)) return res.status(400).json({ code: "OTP_INVALID", message: "Enter the 6-digit code." });
  const pw = passwordProblem(newPassword);
  if (pw) return res.status(400).json({ message: pw, fields: { newPassword: pw } });

  const user = await User.findOne({ email }).select("+password +otpHash");
  if (!user) return res.status(400).json({ code: "OTP_INVALID", message: "Incorrect or expired code." });

  const r = checkOtp(user, otp, "reset");
  if (r.ok) {
    user.password = newPassword; // hashed by the model; also invalidates old tokens
    user.emailVerified = true;
    clearOtp(user);
  }
  await user.save();
  if (!r.ok) return otpError(res, r);
  res.json({ message: "Password updated. You can log in now." });
});

// ---------- Current user ----------
router.get("/me", protect, (req, res) => res.json({ user: publicUser(req.user) }));

// Update own track / profile (whitelisted fields only).
router.put("/me", protect, async (req, res) => {
  const b = req.body ?? {};
  const u = req.user;
  if (["kids", "adults"].includes(b.track)) u.track = b.track;
  if (b.name !== undefined && str(b.name, 80).length >= 2) u.name = str(b.name, 80);
  if (b.age !== undefined) {
    const a = num(b.age, 1, 120);
    if (a !== null) u.age = a;
  }
  if (b.profile && typeof b.profile === "object") {
    for (const k of ["since", "childName", "childAge", "license", "clinic", "nickname"]) {
      if (b.profile[k] !== undefined) u.profile[k] = str(String(b.profile[k]), 120);
    }
    if (b.profile.age !== undefined) {
      const a = num(b.profile.age, 1, 120);
      if (a !== null) u.age = a;
    }
  }
  await u.save();
  res.json({ user: publicUser(u) });
});

// Delete my account and everything attached to it (password required).
router.delete("/me", protect, byIp(5), async (req, res) => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const u = await User.findById(req.user._id).select("+password");
  if (req.user.role === "admin") return res.status(403).json({ message: "Admin accounts cannot be deleted here." });
  if (!password || !(await u.matchPassword(password))) return res.status(401).json({ message: "Incorrect password." });
  await Promise.all([
    Result.deleteMany({ patient: u._id }), Plan.deleteMany({ patient: u._id }),
    Feedback.deleteMany({ patient: u._id }), Checkin.deleteMany({ patient: u._id }),
    User.updateMany({ parent: u._id }, { $set: { parent: null } }),
    User.updateMany({ therapist: u._id }, { $set: { therapist: null } }),
  ]);
  await User.deleteOne({ _id: u._id });
  res.json({ message: "Account deleted" });
});

export default router;
