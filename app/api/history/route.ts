import { productRequest,InputError } from "@/lib/product-api";
import { database } from "@/lib/db";
export const runtime="nodejs";
export function GET(request:Request){return productRequest(request,async user=>{
  const params=new URL(request.url).searchParams,kind=params.get("kind")||"simulations";
  if(!["simulations","scenarios","notifications","advisor_messages"].includes(kind))throw new InputError("Historial invalido.");
  const before=params.get("before"),id=params.get("id")||"";
  if(before&&!Number.isFinite(Date.parse(before)))throw new InputError("Cursor invalido.");
  const rows=await database().query(`SELECT * FROM ${kind} WHERE user_id=$1 AND ($2::timestamptz IS NULL OR (created_at,id)<($2::timestamptz,$3)) ORDER BY created_at DESC,id DESC LIMIT 51`,[user.id,before,id]);
  const page=rows.slice(0,50),last=page.at(-1);
  return {rows:page,next:rows.length>50&&last?{before:last.created_at,id:last.id}:null};
});}
