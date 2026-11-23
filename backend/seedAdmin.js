import mongoose from "mongoose";
import { config } from "./config.js";
import User from "./models/User.js";

const email = (process.env.ADMIN_EMAIL || "admin@stuttercare.com").toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!password || password.length < 12) {
  console.error("Set ADMIN_PASSWORD (12+ characters) in .env before running this script.");
  process.exit(1);
}

await mongoose.connect(config.mongoUri);
if (await User.findOne({ email })) {
  console.log("Admin already exists");
} else {
  await User.create({ name: "Admin", email, password, role: "admin", emailVerified: true });
  console.log("Admin created");
}
process.exit(0);
