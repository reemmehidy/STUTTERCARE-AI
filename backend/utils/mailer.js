import { config } from "../config.js";

let transporter;
async function getTransporter() {
  if (!config.smtp.host) return null;
  if (!transporter) {
    const { default: nodemailer } = await import("nodemailer");
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
      pool: true,
      maxConnections: 3,
    });
  }
  return transporter;
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const COPY = {
  verify: {
    subject: (otp) => `${otp} is your StutterCare AI verification code`,
    en: "Use this code to verify your email and finish creating your account.",
    ar: "استخدم هذا الرمز لتأكيد بريدك الإلكتروني وإكمال إنشاء حسابك.",
  },
  reset: {
    subject: (otp) => `${otp} is your StutterCare AI password reset code`,
    en: "Use this code to reset your password.",
    ar: "استخدم هذا الرمز لإعادة تعيين كلمة المرور.",
  },
};

export async function sendOtpEmail({ to, name, otp, purpose }) {
  const c = COPY[purpose];
  const ttl = config.otpTtlMin;
  const text =
    `Hi ${name},\n\n${c.en}\n\nYour code: ${otp}\n\nIt expires in ${ttl} minutes. ` +
    `If you did not request it, you can ignore this email.\n\n` +
    `مرحبًا ${name}،\n${c.ar}\nالرمز: ${otp}\nصالح لمدة ${ttl} دقائق. إذا لم تطلبه فتجاهل هذه الرسالة.`;

  const html = `<!doctype html><html><body style="margin:0;background:#f3edff;font-family:Arial,Helvetica,sans-serif;color:#1e1540">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:20px;padding:32px">
<tr><td style="font-size:20px;font-weight:700;color:#2a1a5e">StutterCare AI</td></tr>
<tr><td style="padding-top:18px;font-size:16px;line-height:1.5">Hi ${esc(name)},<br>${c.en}</td></tr>
<tr><td align="center" style="padding:24px 0"><div style="display:inline-block;letter-spacing:10px;font-size:34px;font-weight:700;background:#f3edff;color:#5b3fd6;border-radius:14px;padding:14px 22px">${esc(otp)}</div></td></tr>
<tr><td style="font-size:14px;color:#5d5580">This code expires in ${ttl} minutes. If you did not request it, you can safely ignore this email.</td></tr>
<tr><td dir="rtl" style="padding-top:18px;font-size:14px;color:#5d5580;text-align:right">${c.ar}<br>الرمز صالح لمدة ${ttl} دقائق. إذا لم تطلبه فتجاهل هذه الرسالة.</td></tr>
</table></td></tr></table></body></html>`;

  const message = { to, name, subject: c.subject(otp), text, html };
  if (config.brevoApiKey) return sendViaBrevo(message);
  if (config.resendApiKey) return sendViaResend(message);

  const t = await getTransporter();
  if (!t) {
    if (config.isProd) throw new Error("No email provider is configured (set BREVO_API_KEY, RESEND_API_KEY or SMTP_*)");
    console.log(`\n[DEV MAIL] ${purpose} code for ${to}: ${otp}\n`);
    return;
  }
  await t.sendMail({ from: config.smtp.from, to, subject: message.subject, text, html });
}

// "StutterCare AI <me@x.com>" -> { name, email }
export function parseFrom(from) {
  const m = String(from).match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].replace(/^"|"$/g, ""), email: m[2] } : { name: "", email: String(from).trim() };
}

async function postJson(url, headers, body, label) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${label} responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

// Brevo transactional API (HTTPS). Sender must be verified in Brevo.
async function sendViaBrevo({ to, name, subject, text, html }) {
  const sender = parseFrom(config.smtp.from);
  await postJson("https://api.brevo.com/v3/smtp/email", { "api-key": config.brevoApiKey },
    { sender: { name: sender.name || "StutterCare AI", email: sender.email }, to: [{ email: to, name }], subject, htmlContent: html, textContent: text }, "Brevo");
}

// Resend API (HTTPS). Needs a verified domain to email other people.
async function sendViaResend({ to, subject, text, html }) {
  await postJson("https://api.resend.com/emails", { Authorization: `Bearer ${config.resendApiKey}` },
    { from: config.smtp.from, to: [to], subject, html, text }, "Resend");
}
