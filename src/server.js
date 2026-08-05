import "dotenv/config"; 
import { runScreening} from "./orchestrator.js"
import multer from "multer" ; 
import fs from "fs" ; 
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import express from "express";
import cors from "cors";
import { join } from "path";
import { mkdirSync } from "fs";
import { loginWithGoogle, requireAuth, optionalAuth, isGoogleAuthConfigured } from "./auth.js";
import { addScreening, deleteScreening, getUser, summarize } from "./store.js";

const app = express();  
app.use(cors());
app.use(express.json()); 


// create uploads folder in temp directory
const uploadDir = join("/tmp", "uploads");
mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir }); 

// keeps the stored history small — the dashboard only needs the headline fields
function toHistoryEntry(result, source) {
  return {
    candidateName: result.candidateName,
    jobRequirements: result.jobRequirements,
    analysis: result.analysis,
    score: result.score,
    decision: result.decision,
    reason: result.reason,
    email: result.email,
    review: result.review,
    source,
  };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, googleAuth: isGoogleAuthConfigured() });
});

app.post("/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "credential is required" });
    }

    const { token, user } = await loginWithGoogle(credential);
    res.json({
      token,
      user: { username: user.username, email: user.email, name: user.name, picture: user.picture },
      stats: summarize(user),
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: err.message });
  }
});

app.get("/me", requireAuth, (req, res) => {
  const { username, email, name, picture, createdAt } = req.user;
  res.json({
    user: { username, email, name, picture, createdAt },
    stats: summarize(req.user),
  });
});

app.get("/screenings", requireAuth, (req, res) => {
  res.json({
    username: req.user.username,
    stats: summarize(req.user),
    screenings: req.user.screenings,
  });
});

app.get("/screenings/:id", requireAuth, (req, res) => {
  const screening = req.user.screenings.find((s) => s.id === req.params.id);
  if (!screening) return res.status(404).json({ error: "Screening not found" });
  res.json(screening);
});

app.delete("/screenings/:id", requireAuth, async (req, res) => {
  const removed = await deleteScreening(req.user.username, req.params.id);
  if (!removed) return res.status(404).json({ error: "Screening not found" });

  const user = await getUser(req.user.username);
  res.json({ deleted: req.params.id, stats: summarize(user) });
});

app.post("/screen", optionalAuth, async (req, res) => {
  try {
    const { cvText, jobRequirements } = req.body;

    if (!cvText || !jobRequirements) {
      return res.status(400).json({
        error: "cvText and jobRequirements are required"
      });
    }

    console.log(`📥 Received CV for screening`);
    const result = await runScreening(cvText, jobRequirements);

    if (req.user) {
      const saved = await addScreening(req.user.username, toHistoryEntry(result, "text"));
      return res.json({ ...result, id: saved.id, createdAt: saved.createdAt, savedFor: req.user.username });
    }

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ROUTE 2 — user uploads PDF resume
app.post("/upload", optionalAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { jobRequirements } = req.body;

    if (!jobRequirements) {
      return res.status(400).json({ error: "jobRequirements is required" });
    }

    // read PDF file as buffer
    const fileBuffer = fs.readFileSync(req.file.path);

    // extract text from PDF
    const pdfData = await pdfParse(fileBuffer);
    const cvText = pdfData.text;

    console.log(`📥 Received PDF: ${req.file.originalname}`);
    console.log(`📄 Extracted ${cvText.length} characters from PDF`);

    const result = await runScreening(cvText, jobRequirements);

    if (req.user) {
      const saved = await addScreening(req.user.username, {
        ...toHistoryEntry(result, "pdf"),
        fileName: req.file.originalname,
      });
      return res.json({ ...result, id: saved.id, createdAt: saved.createdAt, savedFor: req.user.username });
    }

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 HR Screening Agent running at http://localhost:${PORT}`);
  console.log(`   POST /auth/google — sign in with a Google ID token`);
  console.log(`   GET  /screenings  — screening history for the signed-in username`);
  console.log(`   POST /screen — send CV as text`);
  console.log(`   POST /upload — upload PDF resume`);
});
