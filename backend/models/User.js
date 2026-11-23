import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ["patient", "parent", "therapist", "admin"], default: "patient" },
    track: { type: String, enum: ["kids", "adults"] },
    age: { type: Number, min: 1, max: 120 },
    stars: { type: Number, default: 0, min: 0 },
    profile: {
      since: { type: String, maxlength: 120 },
      childName: { type: String, maxlength: 120 },
      childAge: { type: String, maxlength: 120 },
      license: { type: String, maxlength: 120 },
      clinic: { type: String, maxlength: 120 },
      nickname: { type: String, maxlength: 40 },
    },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Email verification / password reset (OTP). Only a keyed hash is stored.
    emailVerified: { type: Boolean, default: false },
    otpHash: { type: String, select: false },
    otpExpires: Date,
    otpAttempts: { type: Number, default: 0 },
    otpSentAt: Date,
    otpPurpose: { type: String, enum: ["verify", "reset"] },

    // One-time-share code: a child/adult gives it to a parent or therapist to link accounts.
    linkCode: { type: String, unique: true, sparse: true },

    plan: { type: String, enum: ["free", "premium"], default: "free" },
    premiumUntil: Date,

    consentAt: Date,
    passwordChangedAt: Date,
    lastLoginAt: Date,
    lastSeenAt: Date,
  },
  { timestamps: true }
);

// Abandoned sign-ups (never verified) are removed automatically after 7 days.
userSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7 * 24 * 3600, partialFilterExpression: { emailVerified: false } }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.otpHash;
    delete ret.otpExpires;
    delete ret.otpAttempts;
    delete ret.otpSentAt;
    delete ret.otpPurpose;
    return ret;
  },
});

export default mongoose.model("User", userSchema);
