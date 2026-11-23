const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const str = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const normEmail = (v) => str(v, 254).toLowerCase();
export const isEmail = (e) => e.length <= 254 && EMAIL_RE.test(e);

// bcrypt only uses the first 72 bytes, so longer passwords are rejected.
export function passwordProblem(p) {
  if (typeof p !== "string" || p.length < 8) return "Use at least 8 characters.";
  if (Buffer.byteLength(p) > 72) return "Password is too long (max 72 bytes).";
  if (!/[A-Za-z\u0600-\u06FF]/.test(p) || !/\d/.test(p)) return "Use letters and at least one number.";
  return null;
}

export const num = (v, min, max) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
