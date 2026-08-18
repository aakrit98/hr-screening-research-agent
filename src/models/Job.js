import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    requirements: {
      type: String,
      required: true, // this is what gets passed into your existing AI agents as jobRequirements
    },
    location: {
      type: String,
      trim: true,
      default: "Remote",
    },
    employmentType: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Internship"],
      default: "Full-time",
    },
    scoreThreshold: {
      type: Number,
      default: 70, // admin can override the global SCORE_THRESHOLD per job if they want
    },
    isActive: {
      type: Boolean,
      default: true, // lets admin close a job without deleting it
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // the admin who created this job
      required: true,
    },
  },
  { timestamps: true }
);

const Job = mongoose.model("Job", jobSchema);

export default Job;