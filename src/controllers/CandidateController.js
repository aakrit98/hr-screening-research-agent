import fs from "fs";
import https from "https";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import Candidate from "../models/Candidate.js";
import Job from "../models/Job.js";
import { runScreening } from "../orchestrator.js";
import { evaluateCandidate } from "../services/screeningService.js"; 
import Screening from "../models/Screening.js";



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


//get candidate - admin only 

export async function getAllCandidate(req,res) {
  try {
    const candidates = await Candidate.find() 
       .populate("job", "title")      // pulls in the job's title alongside the candidate
      .populate("user", "name email") // pulls in the applicant's name and email
      .sort({ createdAt: -1 });       // newest applications first

        res.json(candidates);
  } catch (error) {
    console.error(error); 
    res.status(500).json({error : error.message});
  }
} 

//get /candidate/:id - admin only -full detail on one candidate 
export async function getCandidateById(req,res) {
  try {
    const candidate = await Candidate.findById(req.params.id) 
        .populate("job" , "title requirements") 
        .populate("user" , "name email") 


        if(!candidate) { 
          return res.status(400).json({error: "candidate not found"});
        } 

        //also fetch the full AI screening trail linked to this candidate 
        const screening = await Screening.findOne({candidate : candidate._id}); 

        res.json({candidate , screening});
  } catch (error) {
    console.error(error); 
    res.status(500).json({error :error.message});
  }
}


//get /candidate/job/:id - admin only // all candidate for only one specific job
export async function getCandidatesByJob(req,res) {
  try {
    const candidates = await Candidate.find({job : req.params.jobId})
    .populate("user" , "name email")
    .sort({createdAt: -1}); 
    res.json(candidates);
  } catch (error) { 
    console.error(error);
    res.satatus(500).json({error : error.message});
    
  }
}


// GET /candidates/stats — admin only — count of applicants per job
export async function getCandidateStats(req, res) {
  try {
    const stats = await Candidate.aggregate([
      {
        $group: {
          _id: "$job",
          total: { $sum: 1 },
          shortlisted: {
            $sum: { $cond: [{ $eq: ["$status", "SHORTLISTED"] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "jobs", // MongoDB collection name (lowercase, pluralized automatically)
          localField: "_id",
          foreignField: "_id",
          as: "job",
        },
      },
      { $unwind: "$job" },
      {
        $project: {
          jobId: "$_id",
          jobTitle: "$job.title",
          total: 1,
          shortlisted: 1,
          rejected: 1,
          pending: 1,
          _id: 0,
        },
      },
      { $sort: { total: -1 } }, // busiest jobs first
    ]);

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
 

//get/candidate/score-distribution  - admin only 

export async function getScoreDistribution(req , res) {
  try { 
    const distribution = await Screening.aggregate([ 
      { 
        $bucket : { 
          groupBy : "$score" , 
          boundaries : [0,20,40,60,101], 
          default : "unknown" , 
          output : {count : {$sum:1}}, 
        },
      },
    ]);
    const labels = { 0: "0-19", 20: "20-39", 40: "40-59", 60: "60-79", 80: "80-100" }; 
     const formatted = distribution.map((d) => ({
      range: labels[d._id] || d._id,
      count: d.count,
    })); 

    res.json(formatted);
  } catch (err){ 
 console.error(err); 
 res.status(500).json({error : err.message});
  }
}

// GET /candidates/my-applications — any logged-in user — their OWN applications only
export async function getMyApplications(req, res) {
  try {
    const candidates = await Candidate.find({ user: req.user.id })
      .populate("job", "title location employmentType")
      .select("-cvText") // don't need to send the full extracted text back to the browser
      .sort({ createdAt: -1 });
    res.json(candidates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}