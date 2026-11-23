import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
    score: { type: Number, min: 0, max: 100 },
  },
  { timestamps: true }
);

export default mongoose.model("Session", sessionSchema);