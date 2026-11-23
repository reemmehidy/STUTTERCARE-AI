import mongoose from "mongoose";

// Weekly exercise plan a therapist sets for one patient.
const planSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    days: { type: mongoose.Schema.Types.Mixed, default: {} }, // { Sun: ["easy-onset"], ... }
    note: { type: String, default: "", maxlength: 1000 },
  },
  { timestamps: true }
);
export default mongoose.model("Plan", planSchema);
