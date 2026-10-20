import { randomUUID, createHash } from "node:crypto";
import Papa from "papaparse";
import { database } from "./db";
import { InputError } from "./product-api";

export function money(value: unknown, signed = false) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || Math.abs(value) > 1e13 || (!signed && value < 0)) throw new InputError("Monto invalido.");
  return value;
}
export function label(value: unknown, max = 160) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new InputError("Texto invalido.");
  return value.trim();
}
export function date(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) throw new InputError("Fecha invalida.");
  return value;
}
export async function ownedAccount(userId: string, id: unknown) {
  if (typeof id !== "string") throw new InputError("Selecciona una cuenta.");
  const rows = await database()`SELECT id FROM financial_accounts WHERE id=${id} AND user_id=${userId} AND household_id IS NULL AND deleted_at IS NULL`;
  if (!rows.length) throw new InputError("Cuenta no disponible.");
  return id;
}
export async function bankingData(userId: string) {
  const sql = database();
  const [accounts, imports, totals] = await Promise.all([
    sql`SELECT a.id,a.name,a.account_type,a.institution_name,a.include_in_net_worth,
      COALESCE(b.balance_cents,0)::text AS balance_cents, b.captured_at
      FROM financial_accounts a LEFT JOIN LATERAL (SELECT balance_cents,captured_at FROM account_balance_snapshots WHERE account_id=a.id ORDER BY captured_at DESC,id DESC LIMIT 1) b ON TRUE
      WHERE a.user_id=${userId} AND a.household_id IS NULL AND a.deleted_at IS NULL ORDER BY a.name,a.id`,
    sql`SELECT ds.id,ds.provider,ds.status,ds.created_at,c.revoked_at FROM data_sources ds JOIN consents c ON c.data_source_id=ds.id AND c.user_id=ds.user_id WHERE ds.user_id=${userId} AND ds.provider='csv' ORDER BY ds.created_at DESC`,
    sql`SELECT COALESCE(SUM(CASE WHEN amount_cents>0 THEN amount_cents ELSE 0 END),0)::text income,
      COALESCE(SUM(CASE WHEN amount_cents<0 THEN -amount_cents ELSE 0 END),0)::text expense
      FROM financial_transactions WHERE user_id=${userId} AND NOT pending
      AND transaction_date >= date_trunc('month', NOW() AT TIME ZONE 'America/Costa_Rica')::date
      AND transaction_date < (date_trunc('month', NOW() AT TIME ZONE 'America/Costa_Rica') + interval '1 month')::date`,
  ]);
  return { accounts, imports, totals: totals[0] };
}
export async function saveAccount(userId: string, body: Record<string,unknown>) {
  const sql=database(), id=body.id ? await ownedAccount(userId,body.id) : randomUUID();
  const name=label(body.name), type=String(body.type);
  if (!["cash","checking","savings","credit_card","loan","mortgage","investment","retirement","wallet","other"].includes(type)) throw new InputError("Tipo de cuenta invalido.");
  const balance=money(body.balanceCents,true);
  if(body.includeInNetWorth===true && (balance<0 || ["credit_card","loan","mortgage"].includes(type))) throw new InputError("Registra las deudas en Activos y deudas con su tasa y cuota. Solo saldos positivos de ahorro o inversion se incluyen aqui.");
  await sql.transaction([
    sql`INSERT INTO financial_accounts(id,user_id,name,account_type,institution_name,include_in_net_worth)
      VALUES(${id},${userId},${name},${type},${typeof body.institution==="string"?body.institution.slice(0,120):""},${body.includeInNetWorth===true})
      ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,account_type=EXCLUDED.account_type,institution_name=EXCLUDED.institution_name,include_in_net_worth=EXCLUDED.include_in_net_worth,updated_at=NOW()
      WHERE financial_accounts.user_id=${userId} AND financial_accounts.household_id IS NULL AND financial_accounts.deleted_at IS NULL`,
    sql`INSERT INTO account_balance_snapshots(id,account_id,balance_cents,source_type)
      SELECT ${randomUUID()},id,${balance},'manual' FROM financial_accounts WHERE id=${id} AND user_id=${userId} AND deleted_at IS NULL`,
  ]);
  return { id };
}
export async function deleteAccount(userId:string,id:unknown) {
  const accountId=await ownedAccount(userId,id);
  await database()`UPDATE financial_accounts SET deleted_at=NOW(),updated_at=NOW() WHERE id=${accountId} AND user_id=${userId}`;
}
export async function transactionPage(userId:string, beforeDate?:string|null,beforeId?:string|null) {
  const rows=await database()`SELECT t.id,t.account_id,t.description,t.category,t.amount_cents::text,t.transaction_date::text,t.pending,a.name account_name
    FROM financial_transactions t LEFT JOIN financial_accounts a ON a.id=t.account_id AND a.user_id=t.user_id
    WHERE t.user_id=${userId} AND (${beforeDate??null}::date IS NULL OR (t.transaction_date,t.id)<(${beforeDate??null}::date,${beforeId??""}))
    ORDER BY t.transaction_date DESC,t.id DESC LIMIT 51`;
  const page=rows.slice(0,50), last=page.at(-1);
  return { rows:page, next:rows.length>50&&last ? { date:last.transaction_date,id:last.id } : null };
}
export async function saveTransaction(userId:string,body:Record<string,unknown>) {
  const sql=database(), accountId=await ownedAccount(userId,body.accountId);
  const id=typeof body.id==="string"?body.id:randomUUID(), description=label(body.description), day=date(body.date), amount=money(body.amountCents,true);
  if(body.id && !(await sql`SELECT id FROM financial_transactions WHERE user_id=${userId} AND id=${id}`).length) throw new InputError("Movimiento no disponible.");
  await sql`INSERT INTO financial_transactions(id,user_id,account_id,transaction_date,description,category,amount_cents)
    VALUES(${id},${userId},${accountId},${day},${description},${typeof body.category==="string"?body.category.slice(0,80):""},${amount})
    ON CONFLICT(id) DO UPDATE SET account_id=EXCLUDED.account_id,transaction_date=EXCLUDED.transaction_date,description=EXCLUDED.description,category=EXCLUDED.category,amount_cents=EXCLUDED.amount_cents,updated_at=NOW()
    WHERE financial_transactions.user_id=${userId}`;
  return { id };
}
export async function deleteTransaction(userId:string,id:unknown) {
  await database()`DELETE FROM financial_transactions WHERE user_id=${userId} AND id=${String(id)}`;
}
export function parseTransactionsCsv(csv:string) {
  const parsed=Papa.parse<Record<string,string>>(csv,{header:true,skipEmptyLines:"greedy"});
  if(parsed.errors.length || !parsed.data.length || parsed.data.length>500) throw new InputError("El CSV debe contener entre 1 y 500 filas validas.");
  return parsed.data.map(row=>{
    if(row.currency && row.currency!=="CRC") throw new InputError("Solo se admite CRC.");
    if(!/^-?\d+(\.\d{1,2})?$/.test(row.amount??"")) throw new InputError("Monto CSV invalido: usa decimales con punto.");
    return { date:date(row.date),description:label(row.description),amount:money(Math.round(Number(row.amount)*100),true),category:(row.category??"").slice(0,80) };
  });
}
export async function importCsv(userId:string,body:Record<string,unknown>) {
  if(body.consent!==true || typeof body.csv!=="string" || body.csv.length>500000) throw new InputError("Confirma el consentimiento y selecciona un CSV valido.");
  const accountId=await ownedAccount(userId,body.accountId), rows=parseTransactionsCsv(body.csv), sql=database();
  const hash=createHash("sha256").update(accountId+"\n"+body.csv).digest("hex");
  const id=createHash("sha256").update(userId+hash).digest("hex");
  // One transaction and deterministic import ID prevent partial and duplicate imports.
  await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${id},0))`,
    sql`INSERT INTO data_sources(id,user_id,source_type,provider,provider_item_id,status) VALUES(${id},${userId},'imported','csv',${hash},'active') ON CONFLICT(id) DO NOTHING`,
    sql`INSERT INTO consents(id,user_id,data_source_id,consent_type,consent_version) VALUES(${id},${userId},${id},'csv_import','1') ON CONFLICT(id) DO NOTHING`,
    ...rows.map((row,index)=>sql`INSERT INTO financial_transactions(id,user_id,account_id,data_source_id,transaction_date,description,category,amount_cents)
      SELECT ${id+":"+index},${userId},${accountId},${id},${row.date},${row.description},${row.category},${row.amount}
      WHERE EXISTS(SELECT 1 FROM consents WHERE id=${id} AND revoked_at IS NULL)
      ON CONFLICT(id) DO NOTHING`),
  ]);
  return { id,count:rows.length };
}
export async function revokeImport(userId:string,id:unknown,erase:boolean) {
  const sql=database(), sourceId=String(id);
  await sql.transaction([
    sql`UPDATE consents SET revoked_at=NOW() WHERE user_id=${userId} AND data_source_id=${sourceId}`,
    sql`UPDATE data_sources SET status='revoked',updated_at=NOW() WHERE user_id=${userId} AND id=${sourceId}`,
    ...(erase?[sql`DELETE FROM financial_transactions WHERE user_id=${userId} AND data_source_id=${sourceId}`]:[]),
  ]);
}
