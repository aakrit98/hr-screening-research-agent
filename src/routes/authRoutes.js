import express from "express";
import { signup, login , googleAuth} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/google" , googleAuth);
router.patch("/seeking-role", protect, updateSeekingRole);
export default router;