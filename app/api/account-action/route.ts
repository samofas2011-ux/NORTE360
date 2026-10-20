import { NextResponse } from "next/server";
import { isSameOriginRequest,checkAuthRateLimit } from "@/lib/auth";
import { requestAccountAction,consumeAccountAction } from "@/lib/account-lifecycle";
import { InputError } from "@/lib/product-api";
import { readAuthBody, validEmail } from "@/lib/auth-inputs";
export const runtime="nodejs";
export async function POST(request:Request){
  if(!isSameOriginRequest(request))return NextResponse.json({error:"Solicitud no permitida."},{status:403});
  try{
    if(!await checkAuthRateLimit("recovery",request))return NextResponse.json({error:"Demasiados intentos."},{status:429});
    const body=await readAuthBody(request);
    if(body.action==="request"){
      if(!validEmail(body.email))throw new InputError("Email invalido.");
      if(body.purpose!==undefined&&!['verify','reset'].includes(String(body.purpose)))throw new InputError("Acción inválida.");
      await requestAccountAction(body.email,body.purpose==="verify"?"verify":"reset");
      return NextResponse.json({message:"Si la cuenta necesita este enlace, recibirás un correo. Revisa también spam. Por seguridad, los reenvíos están limitados."});
    }
    await consumeAccountAction(body.token,body.purpose,body.password);
    return NextResponse.json({message:"Listo. Ya puedes iniciar sesion."});
  }catch(error){return NextResponse.json({error:error instanceof InputError?error.message:error instanceof SyntaxError?"Solicitud inválida.":"No se pudo completar la solicitud. Intenta más tarde."},{status:error instanceof InputError||error instanceof SyntaxError?400:503});}
}
