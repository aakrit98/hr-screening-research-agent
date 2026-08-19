import express from "express";
import { createJob, getJobs, getJobById } from "../controllers/jobController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, requireRole("admin"), createJob);
router.get("/", protect, getJobs);
router.get("/:id", protect, getJobById);

export default router;