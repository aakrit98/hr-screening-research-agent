import Job from "../models/Job"; 

//post-jobs admin only 
export async function createJob(req,res) {
    try { 
        const {title ,description , requirements,location , employmentType , scoreThreshold} = req.body;
        
        if(!title || !description || !requirements) { 
            return res.status(400).json({error : "title , description and requirements are required"});
        } 
        const job = await Job.create({ 
            title , 
            description , 
            requirements,
            location , 
            employmentType , 
            scoreThreshold,
            postedBy : req.user.id ,   // comes from jwt through middleware
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
    res.json(jobs); 
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
