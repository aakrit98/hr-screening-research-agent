import express from "express";
import multer from "multer";
import { storage } from "../config/cloudinary.js";
import { protect } from "../middleware/authMiddleware.js";
import { applyToJob, getAllCandidate , getCandidatesByJob , getCandidateById, getScoreDistribution ,getCandidateStats, getMyApplications, } from "../controllers/CandidateController.js";
import { requireRole } from "../middleware/roleMiddleware.js";


const router = express.Router();

// multer now uploads straight to Cloudinary using the storage config from Step 6a
const upload = multer({ storage });

// POST /candidates/apply/:jobId
// protected — only a logged-in user can apply
router.post("/apply/:jobId", protect, upload.single("cv"), applyToJob); 

router.get("/score-distribution", protect, requireRole("admin"), getScoreDistribution);
router.get("/" , protect , requireRole("admin") , getAllCandidate); 
router.get("/stats" , protect , requireRole("admin") , getCandidateStats);
router.get("/score-distribution", protect, requireRole("admin"), getScoreDistribution);
router.get("/my-applications", protect, getMyApplications);


router.get("/job/:jobId", protect, requireRole("admin"), getCandidatesByJob);
router.get("/:id", protect, requireRole("admin"), getCandidateById);


export default router;