import { runScreening } from "../orchestrator.js";
import Candidate from "../models/Candidate.js";
import Screening from "../models/Screening.js"; 
import { sendCandidateEmail } from "./emailService.js"; 



//runs in the background - not awaited by the controller 
export async function evaluateCandidate(candidateId , cvText , jobRequirements) {
    try {
        console.log(`Starting candidate background ${candidateId}`); 

        //this calls your existing , untouched agent pipeline 
        const result = await runScreening(cvText,jobRequirements); 

        //find the candidate this screening belongs to 
        const candidate = await Candidate.findById(candidateId); 
        if(!candidate) { 
            console.error(`Candidate ${candidateId} not found -caanot save screening result`);
            return;
        } 


        //save the full Ai trail separately 
        await Screening.create({ 
            candidate : candidate._id , 
            job : candidate.job , 
             analysis: result.analysis,
      score: result.score,
      scoreText: result.scoreText,
      decision: result.decision,
      reason: result.reason,
      email: result.email,
      review: result.review, 
        }) 

        candidate.status = result.decision; // shortlist or rejected 
        candidate.candidateName = result.candidateName; 
        await candidate.save(); 
          console.log(`✅ Screening complete for candidate ${candidateId}: ${result.decision}`);

    } catch (error) {
  console.error(`❌ Screening failed for candidate ${candidateId}`, error.message);

  // mark it so it doesn't sit stuck at PENDING forever, and admin can spot failures
  try {
    await Candidate.findByIdAndUpdate(candidateId, { status: "REJECTED" });
  } catch (updateErr) {
    console.error("Also failed to update candidate status after error:", updateErr.message);
  }
}
}
