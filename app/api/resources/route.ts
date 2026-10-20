import { randomUUID } from "node:crypto";
import { productRequest,InputError } from "@/lib/product-api";
import { database } from "@/lib/db";
import { label } from "@/lib/banking-db";
export const runtime="nodejs";
async function isAdmin(userId:string){const rows=await database()`SELECT email,email_verified_at FROM users WHERE id=${userId}`;return Boolean(rows[0]?.email_verified_at&&(process.env.RESOURCE_ADMIN_EMAILS||"").split(",").map(value=>value.trim().toLowerCase()).includes(String(rows[0]?.email).toLowerCase()));}
export function GET(request:Request){return productRequest(request,async user=>{
  const canManage=await isAdmin(user.id);
  const resources=await database()`SELECT r.id,r.title,r.category,r.content,r.url,r.published_at,p.completed_at
    FROM educational_resources r LEFT JOIN resource_progress p ON p.resource_id=r.id AND p.user_id=${user.id}
    WHERE ${canManage} OR (r.published_at<=NOW() AND (r.content IS NOT NULL OR r.url IS NOT NULL)) ORDER BY r.created_at DESC,r.id`;
  return {resources,canManage};
});}
export function POST(request:Request){return productRequest(request,async(user,body)=>{
  const sql=database(),id=String(body.id);
  if(!(await sql`SELECT id FROM educational_resources WHERE id=${id} AND published_at<=NOW()`).length)throw new InputError("Recurso no disponible.");
  await sql`INSERT INTO resource_progress(user_id,resource_id,completed_at) VALUES(${user.id},${id},${body.completed===true?new Date().toISOString():null}) ON CONFLICT(user_id,resource_id) DO UPDATE SET completed_at=EXCLUDED.completed_at`;
  return {ok:true};
});}
export function PUT(request:Request){return productRequest(request,async(user,body)=>{
  if(!await isAdmin(user.id))throw new InputError("No tienes permiso para publicar.");
  const id=typeof body.id==="string"?body.id:randomUUID(),title=label(body.title),category=label(body.category);
  const content=typeof body.content==="string"?body.content.slice(0,12000):"";
  const url=typeof body.url==="string"&&body.url?body.url:null;
  if(url&&!/^https:\/\//.test(url))throw new InputError("El enlace debe usar HTTPS.");
  if(!url&&!content.trim())throw new InputError("Agrega contenido o un enlace.");
  await database()`INSERT INTO educational_resources(id,title,slug,resource_type,category,content,url,published_at)
    VALUES(${id},${title},${id},'article',${category},${content||null},${url},${body.published?new Date().toISOString():null})
    ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,category=EXCLUDED.category,content=EXCLUDED.content,url=EXCLUDED.url,published_at=EXCLUDED.published_at`;
  return {id};
});}
export function DELETE(request:Request){return productRequest(request,async(user,body)=>{
  if(!await isAdmin(user.id))throw new InputError("No tienes permiso para retirar recursos.");
  await database()`UPDATE educational_resources SET published_at=NULL WHERE id=${String(body.id)}`;return {ok:true};
});}
