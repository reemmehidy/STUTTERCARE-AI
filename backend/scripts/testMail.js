// Sends a sample OTP email so you can check your SMTP settings:
//   npm run test:mail -- you@example.com
import { config } from "../config.js";
import { sendOtpEmail } from "../utils/mailer.js";

const to = process.argv[2];
if (!to) { console.error("Usage: npm run test:mail -- you@example.com"); process.exit(1); }
if (!config.smtp.host && !config.brevoApiKey && !config.resendApiKey) {
  console.error("No email provider in backend/.env. Set BREVO_API_KEY (recommended) or SMTP_* first (see SETUP-AR.md).");
  process.exit(1);
}
try {
  await sendOtpEmail({ to, name: "Test", otp: "123456", purpose: "verify" });
  console.log(`Sent! Check the inbox (and Spam) of ${to}.`);
} catch (e) {
  console.error("FAILED to send:", e.message);
  if (/Invalid login|535|EAUTH/i.test(e.message)) console.error("-> Wrong SMTP_USER / SMTP_PASS (Gmail needs an App Password).");
  if (/Brevo responded (401|403)/i.test(e.message)) console.error("-> Wrong BREVO_API_KEY, or the sender address in MAIL_FROM is not verified in Brevo.");
  if (/ECONNECTION|ETIMEDOUT|ENOTFOUND/i.test(e.message)) console.error("-> Cannot reach SMTP_HOST/PORT. Check them and your internet or firewall.");
  process.exit(1);
}
process.exit(0);
