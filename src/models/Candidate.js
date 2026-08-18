import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // the logged-in user who applied
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job", // which job they applied to
      required: true,
    },
    cvUrl: {
      type: String,
      required: true, // Cloudinary URL of the uploaded PDF
    },
    cvText: {
      type: String, // raw extracted text from the PDF, feeds into your agents
    },
    candidateName: {
      type: String, // extracted from CV by cvAnalyzerAgent
    },
    status: {
      type: String,
      enum: ["PENDING", "SHORTLISTED", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

// prevent the same user applying to the same job twice
candidateSchema.index({ user: 1, job: 1 }, { unique: true });

const Candidate = mongoose.model("Candidate", candidateSchema);

export default Candidate;