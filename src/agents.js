import "dotenv/config"; 
import Groq from "groq-sdk";

const groq = new Groq({apiKey : process.env.GROQ_API_KEY});

async function callLLM(prompt , temperature = 0) {
    const response = await groq.chat.completions.create ({ 
        model : "openai/gpt-oss-120b",
        temperature , 
        messages : [{role: "user" , content : prompt}],
    }) 

    return response.choices[0].message.content;
}


//Agent 1 - CV Analyser 
//read cv text and extract key information
const CV_ANALYZER_PROMPT = `You are an expert HR recruiter. 
Extract key information from this CV. 

CV Text : {cvText} 

job Requirements : {jobRequirements} 

Extract and return in this exact format: 
NAME : candidate full name
EXPERIENCE : years of experience 
SKILLS : comma seperated list of skills 
EDUCATION : highest degree 
SUMMARY : 2 sentence of candidate`; 


export async function cvAnalyzerAgent(cvText , jobRequirements) {
    console.log("CV Analyzer : extracting candidate info.....");


const filledPrompt = SCORER_PROMPT.replace("{analysis}" , analysis).replace("{jobRequirements}" , jobRequirements)

        const analysis = await callLLM(filledPrompt , 0)
        console.log("CV analused"); 

        return analysis;
    
    } 



//Agent 2 - SCORER 
// take from the agent 1 and score it 

const SCORER_PROMPT = ` You are an expert HR recruiter.
Score this candidate against the job requirements.

Candidate Analysis:
{analysis}

Job Requirements:
{jobRequirements}

Return in this EXACT format:
SCORE: (number between 0-100)
REASONING: (2 sentences explaining the score)

`; 


export async function scorerAgent(analysis , jobRequirements) {
    console.log("Scoring Cv"); 

    const filledPrompt = SCORER_PROMPT.replace("{analysis}" , analysis).replace("{jobRequirements}" , {jobRequirements})

    const scoreText = await callLLM(filledPrompt , 0) ; 

console.log("Raw score response:", scoreText); 
    //parse score from response 
    const scoreMatch = scoreText.match(/SCORE:\s*(\d+)/); 
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;

    console.log("completed scoring"); 
    return { scoreText, score};
}


// AGENT 3 — DECISION MAKER
// uses score threshold to make decision
// LLM writes personalized reason
const DECISION_PROMPT = `You are an HR manager making hiring decisions.

Candidate Score: {score}/100
Score Threshold: {threshold}/100
Candidate Analysis: {analysis}

Write a professional 2-sentence explanation for the hiring decision.`;

export async function decisionAgent(score, analysis) {
  console.log(`🎯 Decision Agent: making decision...`);

  // rule based decision using threshold from .env
  const threshold = parseInt(process.env.SCORE_THRESHOLD) || 70;
  const decision = score >= threshold ? "SHORTLISTED" : "REJECTED";

  console.log(`📋 Decision: ${decision} (score: ${score}, threshold: ${threshold})`);

  // LLM writes professional explanation
  const filledPrompt = DECISION_PROMPT
    .replace("{score}", score)
    .replace("{threshold}", threshold)
    .replace("{analysis}", analysis);

  const reason = await callLLM(filledPrompt, 0.3);

  return {
    decision,
    score,
    threshold,
    reason,
  };
} 


// AGENT 4 — EMAIL WRITER
// writes personalized email based on decision
const EMAIL_PROMPT = `You are a professional HR manager.
Write a formal email to the candidate based on their application result.

Candidate Name: {candidateName}
Decision: {decision}
Reason: {reason}

If SHORTLISTED:
  - Congratulate them
  - Invite them for an interview
  - Ask them to confirm availability

If REJECTED:
  - Thank them for applying
  - Inform them professionally
  - Encourage future applications

Write a complete professional email with:
Subject: (email subject line)
Body: (full email body)
Sign off as: HR Team`;

export async function emailAgent(candidateName, decision, reason) {
  console.log(`📧 Email Agent: writing ${decision} email...`);

  const filledPrompt = EMAIL_PROMPT
    .replace("{candidateName}", candidateName)
    .replace("{decision}", decision)
    .replace("{reason}", reason);

  const email = await callLLM(filledPrompt, 0.4);

  console.log(`✅ Email written`);
  return email;
}



// AGENT 5 — REVIEWER
// checks if decision and email are fair and professional
const REVIEW_PROMPT= `You are a senior HR director doing final review.
Check if the screening decision and email are fair and professional.

Candidate Analysis:
{analysis}

Decision Made:
{decision}

Email Written:
{email}

Evaluate:
1. Was the decision fair based on the analysis?
2. Is the email professional and appropriate?
3. Does the email match the decision?

Return in this EXACT format:
APPROVED: yes or no
FEEDBACK: brief feedback (2 sentences)`;


export async function reviewAgent(analysis , decision , email) {
    console.log("Agent analysing decision"); 

    const filledPrompt = REVIEW_PROMPT.replace("{analysis}" , analysis)
    .replace("{decision}" , decision).replace("{email}" , email); 

  const reviewText = await callLLM(filledPrompt , 0); 

  const isApproved = reviewText.toLowerCase().includes("approved: yes"); 

  console.log("Review completed"); 

  return { 
    approved : isApproved , 
    feedback : reviewText,
  }
}