import { productRequest, InputError } from "@/lib/product-api";
import { createAdvisorExchange, clearAdvisor, getUserFinancialData } from "@/lib/product-db";
import { consumeRateLimit } from "@/lib/auth-db";
import { createHash,randomUUID } from "node:crypto";
import { database } from "@/lib/db";
export const runtime = "nodejs";
export function POST(request: Request) { return productRequest(request, async (user, body) => {
  if (typeof body.question !== "string" || body.question.trim().length < 3 || body.question.length > 500) throw new InputError("Escribe una pregunta de 3 a 500 caracteres.");
  const data = await getUserFinancialData(user.id);
  if (!data.hasSavedProfile) throw new InputError("Guarda tu Panorama antes de consultar.");
  const useAI=body.mode==="ai";
  if(useAI){
    if(body.aiConsent!==true)throw new InputError("Confirma que deseas compartir tu pregunta y cifras con OpenAI.");
    if(!await consumeRateLimit({keyHash:createHash("sha256").update("advisor-ai:"+user.id).digest("hex"),limit:20,windowSeconds:86400}))throw new InputError("Alcanzaste el limite diario de 20 consultas con IA.");
    await database()`INSERT INTO consents(id,user_id,consent_type,consent_version,metadata_json) VALUES(${randomUUID()},${user.id},'advisor_openai','1','{"scope":"question_and_financial_summary"}'::jsonb)`;
  }
  return { advisorMessages: await createAdvisorExchange(user.id, body.question.trim(), data.inputs,useAI) };
}); }
export function DELETE(request: Request) { return productRequest(request, async user => { await clearAdvisor(user.id); return { advisorMessages: [] }; }); }
