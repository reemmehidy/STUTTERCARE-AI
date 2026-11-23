import "dotenv/config";

const isProd = process.env.NODE_ENV === "production";
const list = (v) => (v || "").split(",").map((s) => s.trim()).filter(Boolean);

const need = (name) => {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name} (see .env.example)`);
    process.exit(1);
  }
  return v;
};

const jwtSecret = need("JWT_SECRET");
if (isProd && jwtSecret.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters in production.");
  process.exit(1);
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: need("MONGO_URI"),
  jwtSecret,
  clientOrigins: list(process.env.CLIENT_URL).length
    ? list(process.env.CLIENT_URL)
    : ["http://localhost:5173"],
  // Some networks cannot resolve MongoDB Atlas SRV records; public DNS fixes it.
  dnsServers: process.env.DNS_SERVERS
    ? list(process.env.DNS_SERVERS)
    : isProd ? [] : ["8.8.8.8", "1.1.1.1"],
  trialDays: Number(process.env.TRIAL_DAYS ?? 7),
  otpTtlMin: Number(process.env.OTP_TTL_MIN) || 10,
  // HTTPS email APIs work on free hosts that block SMTP ports (for example Render free).
  brevoApiKey: process.env.BREVO_API_KEY || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "StutterCare AI <no-reply@stuttercare.app>",
  },
};
