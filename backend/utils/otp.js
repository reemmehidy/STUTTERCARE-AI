import crypto from "node:crypto";
import { config } from "../config.js";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = config.otpTtlMin * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export const isOtpFormat = (v) => typeof v === "string" && /^\d{6}$/.test(v);

// Cryptographically secure 6-digit code (never Math.random).
export const generateOtp = () =>
  crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");

// Only a keyed hash is stored, so a database leak does not reveal live codes.
export const hashOtp = (email, otp) =>
  crypto.createHmac("sha256", config.jwtSecret).update(`${email}:${otp}`).digest("hex");

const safeEqualHex = (a, b) => {
  const A = Buffer.from(a, "hex");
  const B = Buffer.from(b, "hex");
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};

// Resend cooldown: returns { ok:true } or { ok:false, retryAfter } (seconds).
export function canSendOtp(user, now = Date.now()) {
  const wait = user.otpSentAt ? user.otpSentAt.getTime() + OTP_RESEND_COOLDOWN_MS - now : 0;
  return wait > 0 ? { ok: false, retryAfter: Math.ceil(wait / 1000) } : { ok: true };
}

export function clearOtp(user) {
  user.otpHash = undefined;
  user.otpExpires = undefined;
  user.otpAttempts = 0;
  user.otpPurpose = undefined;
}

// Creates a fresh code on the user document (caller saves) and returns the plain code.
export function applyNewOtp(user, purpose, now = Date.now()) {
  const otp = generateOtp();
  user.otpHash = hashOtp(user.email, otp);
  user.otpExpires = new Date(now + OTP_TTL_MS);
  user.otpAttempts = 0;
  user.otpSentAt = new Date(now);
  user.otpPurpose = purpose;
  return otp;
}

// Checks a submitted code. Mutates the user (attempt counter / clearing); caller saves.
// reason: no_code | expired | wrong | locked
export function checkOtp(user, otp, purpose, now = Date.now()) {
  if (!user.otpHash || user.otpPurpose !== purpose) return { ok: false, reason: "no_code" };
  if (!user.otpExpires || user.otpExpires.getTime() < now) {
    clearOtp(user);
    return { ok: false, reason: "expired" };
  }
  if ((user.otpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
    clearOtp(user);
    return { ok: false, reason: "locked" };
  }
  if (safeEqualHex(hashOtp(user.email, otp), user.otpHash)) {
    clearOtp(user);
    return { ok: true };
  }
  user.otpAttempts = (user.otpAttempts || 0) + 1;
  const attemptsLeft = Math.max(OTP_MAX_ATTEMPTS - user.otpAttempts, 0);
  if (attemptsLeft === 0) {
    clearOtp(user);
    return { ok: false, reason: "locked", attemptsLeft };
  }
  return { ok: false, reason: "wrong", attemptsLeft };
}
