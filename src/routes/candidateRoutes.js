import express from "express";
import multer from "multer";
import { storage } from "../config/cloudinary.js";
import { protect } from "../middleware/authMiddleware.js";
import { applyToJob } from "../controllers/candidateController.js";

const router = express.Router();

// multer now uploads straight to Cloudinary using the storage config from Step 6a
const upload = multer({ storage });

// POST /candidates/apply/:jobId
// protected — only a logged-in user can apply
router.post("/apply/:jobId", protect, upload.single("cv"), applyToJob);

export default router;