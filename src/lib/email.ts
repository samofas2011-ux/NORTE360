export function emailConfigured(){
  try {
    const url = new URL(process.env.APP_BASE_URL || "");
    return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_EMAIL_TOKEN && process.env.EMAIL_FROM && url.protocol === "https:" && !url.username && !url.password);
  } catch { return false; }
}
export async function sendTransactionalEmail(to:string,subject:string,text:string,html?:string){
  if(!emailConfigured()) throw new Error("Email delivery is not configured");
  const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(process.env.CLOUDFLARE_ACCOUNT_ID!)}/email/sending/send`,{
    method:"POST",headers:{Authorization:`Bearer ${process.env.CLOUDFLARE_EMAIL_TOKEN}`,"Content-Type":"application/json"},
    body:JSON.stringify({from:{address:process.env.EMAIL_FROM,name:"Norte360"},to,subject,text,html:html||"<p>"+text.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll("\n","<br>")+"</p>"}),
    signal:AbortSignal.timeout(15000),
  });
  const body=await response.json();
  if(!response.ok||body.success!==true||body.result?.permanent_bounces?.length) throw new Error("Email delivery failed");
}
