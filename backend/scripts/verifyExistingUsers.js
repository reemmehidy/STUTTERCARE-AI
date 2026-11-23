// Run ONCE after deploying OTP verification: marks accounts created before it as verified,
// otherwise existing users would be asked for a code they never received.
//   node scripts/verifyExistingUsers.js
import mongoose from "mongoose";
import { config } from "../config.js";
import User from "../models/User.js";

await mongoose.connect(config.mongoUri);
const r = await User.collection.updateMany({ emailVerified: { $exists: false } }, { $set: { emailVerified: true } });
console.log(`Marked ${r.modifiedCount} existing account(s) as verified.`);
process.exit(0);
