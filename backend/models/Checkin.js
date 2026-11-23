import mongoose from "mongoose";

// An adult logs a real-life speaking situation and how it went (for the insights dashboard).
const checkinSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    situation: { type: String, enum: ["phone", "meeting", "shopping", "family", "work", "social", "other"], required: true },
    difficulty: { type: Number, min: 1, max: 5, required: true }, // 1 easy .. 5 very hard
    control: { type: Number, min: 1, max: 5, required: true }, // 1 no control .. 5 felt in control
    note: { type: String, maxlength: 300 },
  },
  { timestamps: true }
);
checkinSchema.index({ patient: 1, createdAt: -1 });
export default mongoose.model("Checkin", checkinSchema);
