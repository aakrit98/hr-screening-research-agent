import {reviewAgent , scorerAgent , emailAgent , cvAnalyzerAgent , decisionAgent} from "./agents.js"; 
                                   



export async function runScreening(cvText , jobRequirements) {
    console.log("Starting HR screening.."); 

    // step 1 - analyse the CV 
    const analysis = await cvAnalyzerAgent(cvText , jobRequirements) ; 
 console.log("analysis result" , analysis);
    //step 2 - score the candidate 
    const {score , scoreText}  = await scorerAgent(analysis , jobRequirements);
console.log("Score result:", score);
    //step 3 - make decision 
    const {decision , reason} = await decisionAgent(score , analysis);

    //step  4 - extract candidate name from analysis 
    //analysis contains "Name: John Doe" somewhere
      const nameMatch = analysis.match(/NAME:\s*(.+)/);
  const candidateName = nameMatch ? nameMatch[1].trim() : "Candidate"; 


// STEP 5 — write email
  const email = await emailAgent(candidateName, decision, reason);

  // STEP 6 — final review
  const review = await reviewAgent(analysis, decision, email);

  console.log(`✅ HR Screening Complete!`);

  return {
    candidateName,
    jobRequirements,
    analysis,
    score,
    scoreText,
    decision,
    reason,
    email,
    review,
  };
}
