import "dotenv/config"; 
import { runScreening} from "./orchestrator.js"
import multer from "multer" ; 
import fs from "fs" ; 
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import express from "express";
import cors from "cors";
import { join } from "path";
import { mkdirSync } from "fs"; 
import { connectDB } from "./config/db.js";

const app = express();  
app.use(cors());
app.use(express.json()); 


// create uploads folder in temp directory
const uploadDir = join("/tmp", "uploads");
mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir });  



app.post("/screen", async (req, res) => {
  try {
    const { cvText, jobRequirements } = req.body;

    if (!cvText || !jobRequirements) {
      return res.status(400).json({
        error: "cvText and jobRequirements are required"
      });
    }

    console.log(`📥 Received CV for screening`);
    const result = await runScreening(cvText, jobRequirements);
    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ROUTE 2 — user uploads PDF resume
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
console.log("inside upload");
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
    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000; 


connectDB().then(() =>{ 
app.listen(PORT, () => {
  console.log(`🚀 HR Screening Agent running at http://localhost:${PORT}`);
  console.log(`   POST /screen — send CV as text`);
  console.log(`   POST /upload — upload PDF resume`);
})
});