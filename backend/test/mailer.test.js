import test from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.MONGO_URI = "mongodb://localhost/test";
process.env.MAIL_FROM = "StutterCare AI <hello@example.com>";
process.env.BREVO_API_KEY = "brevo-key";
const { sendOtpEmail, parseFrom } = await import("../utils/mailer.js");

test("parseFrom reads name and address", () => {
  assert.deepEqual(parseFrom('StutterCare AI <hello@example.com>'), { name: "StutterCare AI", email: "hello@example.com" });
  assert.deepEqual(parseFrom("a@b.co"), { name: "", email: "a@b.co" });
});

test("Brevo: sends the code over HTTPS with the right shape", async () => {
  let call;
  globalThis.fetch = async (url, opts) => { call = { url, opts }; return { ok: true, text: async () => "" }; };
  await sendOtpEmail({ to: "kid@example.com", name: "Lulu", otp: "482913", purpose: "verify" });
  assert.equal(call.url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(call.opts.headers["api-key"], "brevo-key");
  const body = JSON.parse(call.opts.body);
  assert.equal(body.sender.email, "hello@example.com");
  assert.equal(body.to[0].email, "kid@example.com");
  assert.ok(body.subject.includes("482913") && body.htmlContent.includes("482913") && /[\u0600-\u06FF]/.test(body.htmlContent));
});

test("Brevo failure is reported (so the server can tell the user)", async () => {
  globalThis.fetch = async () => ({ ok: false, status: 401, text: async () => "unauthorized" });
  await assert.rejects(() => sendOtpEmail({ to: "a@b.co", name: "A", otp: "111111", purpose: "reset" }), /Brevo responded 401/);
});
