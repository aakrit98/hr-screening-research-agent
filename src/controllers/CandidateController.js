import fs from "fs";
import https from "https";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import Candidate from "../models/Candidate.js";
import Job from "../models/Job.js";
import { runScreening } from "../orchestrator.js";
import { evaluateCandidate } from "../services/screeningService.js";



//post / candidate /apply / :jobid 
export async function applyToJob(req,res) {
    try { 
        const {jobId} = req.params; 

        if(!req.file) { 
            return res.status(400).json({error : "CV file is required"});
        } 

        //confirm the job exists and is still open 
        const job = await Job.findById(jobId); 
        if(!job || !job.isActive) { 
            return res.status(404).json({error : "Job not found or no longer active"});
        }

          // req.file.path is now a Cloudinary URL (because multer is using CloudinaryStorage)
          const cvUrl = req.file.path; 

          //download the pdf from cloudinary so we can extract its text 
          const cvText = await extractTextFromUrl(cvUrl); 


          //create the candidate record immediately -status default to prnding 
          const candidate = await Candidate.create({ 
            user: req.user.id ,
            job : jobId , 
            cvUrl , 
            cvText,   
          });


 // respond to the user right away — don't make them wait for the AI
    res.status(201).json({
      message: "Application submitted successfully. Result will be available soon.",
      candidateId: candidate._id,
      status: candidate.status,
    });

    // run screening in the background — response has already been sent
    evaluateCandidate(candidate._id, cvText, job.requirements);

  } catch (err) {
   console.error("Candidate controller error:", err.message, err.stack);
    // avoid double-sending a response if headers already went out
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
}

// helper: download PDF from Cloudinary URL and extract text
function extractTextFromUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const pdfData = await pdfParse(buffer);
          resolve(pdfData.text);
        } catch (err) {
          reject(err);
        }
      });
      response.on("error", reject);
    });
  });
}




