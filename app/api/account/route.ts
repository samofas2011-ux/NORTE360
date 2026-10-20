import { productRequest,InputError } from "@/lib/product-api";
import { changeAccountPassword,eraseAccount,exportAccount,requestAccountAction } from "@/lib/account-lifecycle";
import { database } from "@/lib/db";
import { checkAuthRateLimit,clearSessionCookie } from "@/lib/auth";
import { emailConfigured } from "@/lib/email";
export const runtime="nodejs";
export function GET(request:Request){return productRequest(request,async user=>{
  if(new URL(request.url).searchParams.get("export")==="true")return exportAccount(user.id);
  const rows=await database()`SELECT name,email,email_verified_at FROM users WHERE id=${user.id}`;
  return {...rows[0],emailReady:emailConfigured(),aiReady:Boolean(process.env.OPENAI_API_KEY&&process.env.OPENAI_MODEL)};
});}
export function POST(request:Request){return productRequest(request,async(user,body)=>{
  if(!await checkAuthRateLimit("account_action",request,user.id))throw new InputError("Demasiados intentos. Intenta en 15 minutos.");
  if(body.action==="password"){await changeAccountPassword(user.id,body.currentPassword,body.newPassword);await clearSessionCookie();}
  else if(body.action==="verify"){const rows=await database()`SELECT email FROM users WHERE id=${user.id}`;await requestAccountAction(String(rows[0].email),"verify");}
  else throw new InputError("Accion invalida.");
  return {ok:true};
});}
export function DELETE(request:Request){return productRequest(request,async(user,body)=>{
  if(!await checkAuthRateLimit("account_delete",request,user.id))throw new InputError("Demasiados intentos.");
  await eraseAccount(user.id,body.password);await clearSessionCookie();return {ok:true};
});}
