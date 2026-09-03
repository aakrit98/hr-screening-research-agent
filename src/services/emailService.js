import {Resend} from "resend"; 

const resend = new Resend(process.env.RESND_API_KEY); 

//send ai generated email to candidate 
export async function sendCandidateEmail(candidateEmail , candidateName , decision , emailContent) {
    try { 
         // your AI's emailAgent generates text with "Subject: ..." and "Body: ..." — let's split them 
          const subjectMatch = emailContent.match(/Subject:\s*(.+)/);
    const subject = subjectMatch ? subjectMatch[1].trim() : `Application Update - ${decision}`;

          // everything after "Body:" is the actual email content
    const bodyMatch = emailContent.split(/Body:\s*/i)[1];
    const body = bodyMatch ? bodyMatch.trim() : emailContent; 


    const result = await resend.emails.send({ 
        from : "TalentBridge <maharjanfreaky@gmail.com>",
        to : candidateEmail , 
        subject , 
        text : body,
    }) ; 

    console.log(`EMail send to candidate ${candidateEmail}`) ; 
    return result;
      }  catch(err) { 
        console.error("failed to send email" , err.message); 
        return null;
      }

}