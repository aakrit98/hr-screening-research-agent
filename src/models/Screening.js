import mongoose from "mongoose";

const screeningSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    analysis: {
      type: String, // raw output from cvAnalyzerAgent
    },
    score: {
      type: Number,
    },
    scoreText: {
      type: String, // raw output from scorerAgent (score + reasoning)
    },
    decision: {
      type: String,
      enum: ["SHORTLISTED", "REJECTED"],
    },
    reason: {
      type: String, // from decisionAgent
    },
    email: {
      type: String, // from emailAgent
    },
    review: {
      approved: {
        type: Boolean,
      },
      feedback: {
        type: String,
      },
    },
  },
  { timestamps: true }
);

const Screening = mongoose.model("Screening", screeningSchema);

export default Screening;