import { randomBytes,createHash,randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { database } from "./db";
import { InputError } from "./product-api";
import { validatePassword } from "./auth";
import { sendTransactionalEmail,emailConfigured } from "./email";
import { accountEmail } from "./account-emails";
import { deliverAccountEmails } from "./account-email-outbox";
import { consumeRateLimit } from "./auth-db";

export async function confirmPassword(userId:string,password:unknown){
  if(typeof password!=="string"||password.length>128)throw new InputError("Password invalido.");
  const rows=await database()`SELECT password_hash FROM users WHERE id=${userId} AND deleted_at IS NULL`;
  if(!rows[0]||!await bcrypt.compare(password,String(rows[0].password_hash)))throw new InputError("El password actual no coincide.");
}
export async function requestAccountAction(email:string,purpose:"verify"|"reset"){
  if(!emailConfigured())throw new InputError("El envio de correo aun no esta habilitado.");
  const sql=database(),rows=await sql`SELECT id,email,email_verified_at FROM users WHERE email=${email.trim().toLowerCase()} AND deleted_at IS NULL`;
  if(!rows[0]||(purpose==="verify"&&rows[0].email_verified_at))return;
  const allowed = await consumeRateLimit({keyHash:createHash("sha256").update(`email-action:${purpose}:${rows[0].id}`).digest("hex"),limit:3,windowSeconds:900});
  if (!allowed) return;
  const token=randomBytes(32).toString("hex"),hash=createHash("sha256").update(token).digest("hex");
  await sql`INSERT INTO account_action_tokens(token_hash,user_id,purpose,expires_at) VALUES(${hash},${rows[0].id},${purpose},NOW()+INTERVAL '30 minutes')`;
  const url=new URL("/account-action",process.env.APP_BASE_URL);
  url.hash=new URLSearchParams({token,purpose}).toString();
  const message = accountEmail(purpose,url.href);
  try{await sendTransactionalEmail(String(rows[0].email),message.subject,message.text,message.html);}
  catch(error){await sql`DELETE FROM account_action_tokens WHERE token_hash=${hash}`;throw error;}
}
export async function consumeAccountAction(token:unknown,purpose:unknown,password:unknown){
  if(typeof token!=="string"||!/^[a-f0-9]{64}$/.test(token)||!["verify","reset"].includes(String(purpose)))throw new InputError("Enlace invalido.");
  const sql=database(),hash=createHash("sha256").update(token).digest("hex");
  if(purpose==="reset"){
    if(typeof password!=="string"||!validatePassword(password))throw new InputError("Usa al menos 15 caracteres y máximo 72 bytes.");
    const passwordHash=await bcrypt.hash(password,12);
    const rows=await sql`WITH token AS (
      DELETE FROM account_action_tokens WHERE token_hash=${hash} AND purpose='reset' AND expires_at>NOW() AND used_at IS NULL RETURNING user_id
    ), changed AS (
      UPDATE users SET password_hash=${passwordHash},updated_at=NOW() WHERE id IN(SELECT user_id FROM token) AND deleted_at IS NULL RETURNING id
    ), sessions_revoked AS (
      UPDATE sessions SET revoked_at=NOW() WHERE user_id IN(SELECT id FROM changed)
    ), other_tokens AS (
      DELETE FROM account_action_tokens WHERE user_id IN(SELECT id FROM changed) AND purpose='reset'
    ), notice AS (
      INSERT INTO account_email_outbox(id,user_id,kind) SELECT ${randomUUID()},id,'password_changed' FROM changed
    ) SELECT id FROM changed`;
    if(!rows.length)throw new InputError("El enlace ya se uso o vencio.");
    try { await deliverAccountEmails(String(rows[0].id)); } catch { console.error("Account notification pending"); }
  }else{
    const rows=await sql`WITH token AS (
      DELETE FROM account_action_tokens WHERE token_hash=${hash} AND purpose='verify' AND expires_at>NOW() AND used_at IS NULL RETURNING user_id
    ), changed AS (
      UPDATE users SET email_verified_at=NOW(),updated_at=NOW() WHERE id IN(SELECT user_id FROM token) AND deleted_at IS NULL AND email_verified_at IS NULL RETURNING id
    ), notice AS (
      INSERT INTO account_email_outbox(id,user_id,kind) SELECT 'welcome:'||id,id,'welcome' FROM changed ON CONFLICT(id) DO NOTHING
    ) SELECT id FROM changed`;
    if(!rows.length)throw new InputError("El enlace ya se uso o vencio.");
    try { await deliverAccountEmails(String(rows[0].id)); } catch { console.error("Welcome notification pending"); }
  }
}
export async function changeAccountPassword(userId:string,current:unknown,next:unknown){
  await confirmPassword(userId,current);
  if(typeof next!=="string"||!validatePassword(next))throw new InputError("Usa al menos 15 caracteres y máximo 72 bytes.");
  const sql=database(),hash=await bcrypt.hash(next,12);
  await sql.transaction([
    sql`UPDATE users SET password_hash=${hash},updated_at=NOW() WHERE id=${userId}`,
    sql`UPDATE sessions SET revoked_at=NOW() WHERE user_id=${userId}`,
    sql`DELETE FROM account_action_tokens WHERE user_id=${userId}`,
    sql`INSERT INTO account_email_outbox(id,user_id,kind) VALUES(${randomUUID()},${userId},'password_changed')`,
  ]);
  try { await deliverAccountEmails(userId); } catch { console.error("Account notification pending"); }
}
export async function exportAccount(userId:string){
  const sql=database();
  const tables=["financial_profiles","financial_accounts","financial_transactions","assets","liabilities","goals","goal_contributions","scenarios","simulations","calculation_runs","advisor_conversations","advisor_messages","notifications","data_sources","consents","resource_progress"];
  const entries=await Promise.all(tables.map(async table=>[table,await sql.query(`SELECT * FROM ${table} WHERE user_id=$1`,[userId])] as const));
  const user=await sql`SELECT id,name,email,email_verified_at,created_at FROM users WHERE id=${userId}`;
  const snapshots=await sql`SELECT b.* FROM account_balance_snapshots b JOIN financial_accounts a ON a.id=b.account_id WHERE a.user_id=${userId}`;
  return {exportedAt:new Date().toISOString(),user:user[0],...Object.fromEntries(entries),account_balance_snapshots:snapshots};
}
export async function eraseAccount(userId:string,password:unknown){
  await confirmPassword(userId,password);
  const sql=database();
  // Hold the account and households while checking whether another member needs ownership.
  const result=await sql.transaction([
    sql`SELECT id FROM users WHERE id=${userId} FOR UPDATE`,
    sql`SELECT id FROM households WHERE created_by_user_id=${userId} FOR UPDATE`,
    sql`SELECT h.id FROM households h WHERE h.created_by_user_id=${userId}
      AND EXISTS(SELECT 1 FROM household_members WHERE household_id=h.id AND user_id<>${userId})`,
  ]);
  if(result[2].length)throw new InputError("Primero retira los otros miembros de los hogares que administras.");
  // DELETE is still conditioned on membership to protect against a concurrent invitation.
  await sql.transaction([
    sql`DELETE FROM households WHERE created_by_user_id=${userId}
      AND NOT EXISTS(SELECT 1 FROM household_members WHERE household_id=households.id AND user_id<>${userId})`,
    sql`DELETE FROM audit_events WHERE user_id=${userId}`,
    sql`DELETE FROM users WHERE id=${userId}`,
  ]);
}
