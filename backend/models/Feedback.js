import mongoose from "mongoose";

// A note from a therapist to a patient (shown in "Therapist feedback" + notifications).
const feedbackSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fromName: { type: String, required: true },
    text: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);
export default mongoose.model("Feedback", feedbackSchema);
