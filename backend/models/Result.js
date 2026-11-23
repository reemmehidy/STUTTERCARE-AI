import mongoose from "mongoose";

// One finished practice attempt (exercise recording, coach word, game round...).
const resultSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: ["exercise", "coach", "game", "simulation"], default: "exercise" },
    exerciseId: { type: String, required: true, maxlength: 60 },
    score: { type: Number, min: 0, max: 100, required: true },
    wpm: { type: Number, min: 0, max: 400, default: 0 },
    pauses: { type: Number, min: 0, max: 200, default: 0 },
    repetitions: { type: Number, min: 0, max: 200, default: 0 },
    prolongations: { type: Number, min: 0, max: 200, default: 0 },
    duration: { type: Number, min: 0, max: 3600, default: 0 },
    word: { type: String, maxlength: 60 },
    attempts: { type: Number, min: 0, max: 100 },
    // true when the numbers come from real measurement (audio + speech recognition)
    measured: { type: Boolean, default: false },
  },
  { timestamps: true }
);
resultSchema.index({ patient: 1, createdAt: -1 });

export default mongoose.model("Result", resultSchema);
