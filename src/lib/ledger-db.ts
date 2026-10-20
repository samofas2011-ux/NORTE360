import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { InputError } from "./product-api";
import { nonNegativeInteger } from "./api-inputs";

export type LedgerItem = { id: string; name: string; kind: "assets" | "liabilities"; amountCents: number; category: string; annualInterestBps: number; minimumPaymentCents: number };
const categories = {
  assets: ["cash", "property", "vehicle", "investment", "retirement", "business", "other"],
  liabilities: ["credit_card", "mortgage", "personal_loan", "car_loan", "student_loan", "other"],
};
function sqlClient() { if (!process.env.DATABASE_URL) throw new Error("Missing database"); return neon(process.env.DATABASE_URL, { fetchOptions: { signal: AbortSignal.timeout(15000) } }); }
export async function listLedger(userId: string): Promise<LedgerItem[]> {
  const sql = sqlClient();
  const [assets, debts] = await Promise.all([
    sql`SELECT id, name, value_cents, asset_type FROM assets WHERE user_id = ${userId} AND household_id IS NULL AND deleted_at IS NULL ORDER BY name`,
    sql`SELECT id, name, balance_cents, liability_type, annual_interest_bps, minimum_payment_cents FROM liabilities WHERE user_id = ${userId} AND household_id IS NULL AND deleted_at IS NULL ORDER BY name`,
  ]);
  return [
    ...assets.map(row => ({ id: String(row.id), name: String(row.name), kind: "assets" as const, amountCents: Number(row.value_cents), category: String(row.asset_type), annualInterestBps: 0, minimumPaymentCents: 0 })),
    ...debts.map(row => ({ id: String(row.id), name: String(row.name), kind: "liabilities" as const, amountCents: Number(row.balance_cents), category: String(row.liability_type), annualInterestBps: Number(row.annual_interest_bps), minimumPaymentCents: Number(row.minimum_payment_cents) })),
  ];
}
export async function writeLedger(userId: string, body: Record<string, unknown>, remove = false) {
  const sql = sqlClient();
  if (body.kind !== "assets" && body.kind !== "liabilities") throw new InputError("Tipo de registro invalido.");
  const kind = body.kind;
  const id = typeof body.id === "string" ? body.id : randomUUID();
  if (remove) {
    await sql.query(`UPDATE ${kind} SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2 AND household_id IS NULL`, [id, userId]);
    return;
  }
  if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 120) throw new InputError("Nombre invalido.");
  if (typeof body.category !== "string" || !categories[kind].includes(body.category)) throw new InputError("Categoria invalida.");
  const amount = nonNegativeInteger(body.amountCents);
  const rate = nonNegativeInteger(body.annualInterestBps ?? 0, 100000);
  const payment = nonNegativeInteger(body.minimumPaymentCents ?? 0);
  if (body.id) {
    const found = await sql.query(`SELECT id FROM ${kind} WHERE id = $1 AND user_id = $2 AND household_id IS NULL AND deleted_at IS NULL`, [id, userId]);
    if (!found.length) throw new InputError("Registro no disponible.");
  }
  if (kind === "assets") {
    await sql`INSERT INTO assets (id, user_id, name, asset_type, value_cents) VALUES (${id}, ${userId}, ${body.name.trim()}, ${body.category}, ${amount})
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, asset_type = EXCLUDED.asset_type, value_cents = EXCLUDED.value_cents, updated_at = NOW(), valued_at = NOW()
      WHERE assets.user_id = ${userId} AND assets.household_id IS NULL AND assets.deleted_at IS NULL`;
  } else {
    await sql`INSERT INTO liabilities (id, user_id, name, liability_type, balance_cents, annual_interest_bps, minimum_payment_cents)
      VALUES (${id}, ${userId}, ${body.name.trim()}, ${body.category}, ${amount}, ${rate}, ${payment})
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, liability_type = EXCLUDED.liability_type, balance_cents = EXCLUDED.balance_cents,
        annual_interest_bps = EXCLUDED.annual_interest_bps, minimum_payment_cents = EXCLUDED.minimum_payment_cents, updated_at = NOW()
      WHERE liabilities.user_id = ${userId} AND liabilities.household_id IS NULL AND liabilities.deleted_at IS NULL`;
  }
}
