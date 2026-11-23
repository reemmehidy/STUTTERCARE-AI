import test from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.MONGO_URI = "mongodb://localhost/test";
const o = await import("../utils/otp.js");
const v = await import("../utils/validate.js");

const fresh = () => ({ email: "a@b.co" });

test("generateOtp is always 6 digits", () => {
  for (let i = 0; i < 2000; i++) assert.match(o.generateOtp(), /^\d{6}$/);
});

test("correct code passes once, then is consumed", () => {
  const u = fresh();
  const code = o.applyNewOtp(u, "verify");
  assert.notEqual(u.otpHash, code); // hashed, not plain
  assert.deepEqual(o.checkOtp(u, code, "verify"), { ok: true });
  assert.equal(o.checkOtp(u, code, "verify").reason, "no_code");
});

test("wrong code counts attempts and locks after 5", () => {
  const u = fresh();
  const code = o.applyNewOtp(u, "verify");
  const bad = code === "000000" ? "111111" : "000000";
  for (let i = 1; i <= 4; i++) {
    const r = o.checkOtp(u, bad, "verify");
    assert.equal(r.reason, "wrong");
    assert.equal(r.attemptsLeft, 5 - i);
  }
  assert.equal(o.checkOtp(u, bad, "verify").reason, "locked");
  assert.equal(o.checkOtp(u, code, "verify").reason, "no_code"); // even the right code is dead now
});

test("expired code is rejected", () => {
  const u = fresh();
  const code = o.applyNewOtp(u, "verify", Date.now() - o.OTP_TTL_MS - 1000);
  assert.equal(o.checkOtp(u, code, "verify").reason, "expired");
});

test("a verify code cannot be used for password reset", () => {
  const u = fresh();
  const code = o.applyNewOtp(u, "verify");
  assert.equal(o.checkOtp(u, code, "reset").reason, "no_code");
});

test("resend cooldown", () => {
  const u = fresh();
  assert.equal(o.canSendOtp(u).ok, true);
  o.applyNewOtp(u, "verify");
  const g = o.canSendOtp(u);
  assert.equal(g.ok, false);
  assert.ok(g.retryAfter > 0 && g.retryAfter <= 60);
  assert.equal(o.canSendOtp(u, Date.now() + 61_000).ok, true);
});

test("code for one email does not verify another", () => {
  const u = { email: "a@b.co" };
  const code = o.applyNewOtp(u, "verify");
  u.email = "other@b.co";
  assert.equal(o.checkOtp(u, code, "verify").reason, "wrong");
});

test("validators", () => {
  assert.equal(v.isEmail("x@y.com"), true);
  assert.equal(v.isEmail("x@y"), false);
  assert.ok(v.passwordProblem("short1"));
  assert.ok(v.passwordProblem("onlyletters"));
  assert.equal(v.passwordProblem("goodpass1"), null);
  assert.equal(v.num("5", 1, 10), 5);
  assert.equal(v.num("x", 1, 10), null);
});
