import Job from "../models/Job.js"; 
import {generateEmbedding} from "../utils/embeddings.js"
import { cosineSimilarity } from "../utils/embeddings.js";


//post-jobs admin only 
export async function createJob(req,res) {
    try { 
        const {title ,description , requirements,location , employmentType , scoreThreshold} = req.body;
        
        if(!title || !description || !requirements) { 
            return res.status(400).json({error : "title , description and requirements are required"});
        } 

        //combine the jobs meaningful text into one string for embedding 
        const textForEmbedding = `${title}. ${description}. ${requirements}`;
        const embedding = await generateEmbedding(textForEmbedding);

        const job = await Job.create({ 
            title , 
            description , 
            requirements,
            location , 
            employmentType , 
            scoreThreshold,
            postedBy : req.user.id ,   // comes from jwt through middleware 
            embedding
        });
        res.status(201).json(job);
    } catch(error) { 
        console.log(err);
        res.status(500).json({error : err.message});
    }
}


//get /jobs -anyone loggged in can view(users browse , admins manage)  
export async function getJobs(req,res ) {
    

try { 
    const jobs = await Job.find({isActive : true}).sort({createdAt : -1}); 

     // fetch the logged-in user's seeking-role embedding
    const user = await User.findById(req.user.id).select("+seekingRoleEmbedding");

     // if the user hasn't set a seeking role yet, just return jobs as normal
    if (!user?.seekingRoleEmbedding || user.seekingRoleEmbedding.length === 0) {
      const plainJobs = jobs.map((job) => {
        const jobObj = job.toObject();
        delete jobObj.embedding; // never send raw embeddings to the frontend
        return jobObj;
      });
      return res.json(plainJobs);
    }
    
    //calculate a match score for each job , then sort by bes match first 
    const jobsWithScores = jobs.map((job) =>{
        const jobObj = job.toObject();
        const matchScore = job.embedding?.length ? cosineSimilarity(user.seekingRoleEmbedding , job.embedding):0;
        delete jobObj.embedding;  //strip before sending to frontend 
        return {...jobObj , matchScore};  

    });

    jobsWithScores.sort((a,b) => b.matchScore - a.matchScore);
    res.json(jobsWithScores); 
} catch(err) { 
console.error(err); 
res.status(500).json({error : err.message});
}
} 


//Get /jobs/:id - view single jobs 
export async function getJobById(req,res) {
    try { 
        const job = await Job.findById(req.params.id); 
        if(!job) { 
            return res.status(404).json({error : "Job not found"}); 
        }   

        res.json(job);
    } catch(err) { 
console.error(err); 
res.status(500).json({error:err.message});
    }
}
