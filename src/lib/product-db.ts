import { randomUUID } from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { FinancialInputs } from "./financial-engine";

export type UserFinancialData = {
  inputs: FinancialInputs;
  hasSavedProfile: boolean;
  updatedAt: string | null;
};

type Sql = NeonQueryFunction<false, false>;

const EMPTY_INPUTS: FinancialInputs = {
  monthlyIncomeCents: 0,
  monthlyExpenseCents: 0,
  savingsCents: 0,
  assetsCents: 0,
  loanBalanceCents: 0,
  annualInterestBps: 0,
  minimumPaymentCents: 0,
  extraPaymentCents: 0,
  targetAmountCents: 0,
  targetDownPaymentBps: 2000,
};

function getSql(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return neon(url);
}

export function emptyFinancialData(): UserFinancialData {
  return {
    inputs: EMPTY_INPUTS,
    hasSavedProfile: false,
    updatedAt: null,
  };
}

export async function getUserFinancialData(userId: string): Promise<UserFinancialData> {
  const sql = getSql();
  const profileRows = (await sql`
    SELECT monthly_income_cents, monthly_expense_cents, updated_at
    FROM financial_profiles
    WHERE user_id = ${userId}
      AND household_id IS NULL
    ORDER BY updated_at DESC
    LIMIT 1
  `) as Array<{
    monthly_income_cents: string | number;
    monthly_expense_cents: string | number;
    updated_at: string;
  }>;

  const assetRows = (await sql`
    SELECT
      COALESCE(SUM(CASE WHEN asset_type = 'cash' THEN value_cents ELSE 0 END), 0) AS savings_cents,
      COALESCE(SUM(CASE WHEN asset_type <> 'cash' THEN value_cents ELSE 0 END), 0) AS assets_cents
    FROM assets
    WHERE user_id = ${userId}
      AND household_id IS NULL
      AND deleted_at IS NULL
  `) as Array<{ savings_cents: string | number; assets_cents: string | number }>;

  const liabilityRows = (await sql`
    SELECT
      COALESCE(SUM(balance_cents), 0) AS loan_balance_cents,
      COALESCE(SUM(minimum_payment_cents), 0) AS minimum_payment_cents,
      CASE
        WHEN COALESCE(SUM(balance_cents), 0) > 0
          THEN ROUND(SUM(balance_cents * annual_interest_bps)::numeric / SUM(balance_cents))::int
        ELSE 0
      END AS annual_interest_bps
    FROM liabilities
    WHERE user_id = ${userId}
      AND household_id IS NULL
      AND deleted_at IS NULL
  `) as Array<{
    loan_balance_cents: string | number;
    minimum_payment_cents: string | number;
    annual_interest_bps: string | number;
  }>;

  const goalRows = (await sql`
    SELECT target_amount_cents, assumptions_json
    FROM goals
    WHERE user_id = ${userId}
      AND household_id IS NULL
      AND status = 'active'
      AND deleted_at IS NULL
    ORDER BY priority ASC, updated_at DESC
    LIMIT 1
  `) as Array<{
    target_amount_cents: string | number;
    assumptions_json: Record<string, unknown> | string | null;
  }>;

  const profile = profileRows[0];
  const assets = assetRows[0];
  const liabilities = liabilityRows[0];
  const goal = goalRows[0];
  const assumptions = parseAssumptions(goal?.assumptions_json);

  return {
    inputs: {
      monthlyIncomeCents: toNumber(profile?.monthly_income_cents),
      monthlyExpenseCents: toNumber(profile?.monthly_expense_cents),
      savingsCents: toNumber(assets?.savings_cents),
      assetsCents: toNumber(assets?.assets_cents),
      loanBalanceCents: toNumber(liabilities?.loan_balance_cents),
      annualInterestBps: toNumber(liabilities?.annual_interest_bps),
      minimumPaymentCents: toNumber(liabilities?.minimum_payment_cents),
      extraPaymentCents: toNumber(assumptions.extraPaymentCents),
      targetAmountCents: toNumber(goal?.target_amount_cents),
      targetDownPaymentBps: toNumber(assumptions.targetDownPaymentBps) || 2000,
    },
    hasSavedProfile: Boolean(profile),
    updatedAt: profile?.updated_at ?? null,
  };
}

export async function saveUserFinancialData(userId: string, inputs: FinancialInputs) {
  const sql = getSql();

  await sql.transaction([
    upsertProfile(sql, userId, inputs),
    upsertAsset(sql, userId, "Ahorro y efectivo", "cash", inputs.savingsCents),
    upsertAsset(sql, userId, "Activos adicionales", "other", inputs.assetsCents),
    upsertLiability(sql, userId, inputs),
    upsertGoal(sql, userId, inputs),
  ]);

  return getUserFinancialData(userId);
}

function upsertProfile(sql: Sql, userId: string, inputs: FinancialInputs) {
  return sql`
    INSERT INTO financial_profiles (
      id,
      user_id,
      default_currency,
      country_code,
      monthly_income_cents,
      monthly_expense_cents
    )
    VALUES (
      ${randomUUID()},
      ${userId},
      'CRC',
      'CR',
      ${inputs.monthlyIncomeCents},
      ${inputs.monthlyExpenseCents}
    )
    ON CONFLICT (user_id) WHERE household_id IS NULL
    DO UPDATE SET
      monthly_income_cents = EXCLUDED.monthly_income_cents,
      monthly_expense_cents = EXCLUDED.monthly_expense_cents,
      default_currency = EXCLUDED.default_currency,
      country_code = EXCLUDED.country_code,
      updated_at = NOW()
  `;
}

function upsertAsset(
  sql: Sql,
  userId: string,
  name: string,
  assetType: "cash" | "other",
  valueCents: number,
) {
  return sql`
    INSERT INTO assets (id, user_id, name, asset_type, value_cents, currency, valuation_source)
    VALUES (${randomUUID()}, ${userId}, ${name}, ${assetType}, ${valueCents}, 'CRC', 'manual')
    ON CONFLICT (user_id, name) WHERE household_id IS NULL AND deleted_at IS NULL
    DO UPDATE SET
      asset_type = EXCLUDED.asset_type,
      value_cents = EXCLUDED.value_cents,
      currency = EXCLUDED.currency,
      valuation_source = EXCLUDED.valuation_source,
      valued_at = NOW(),
      updated_at = NOW()
  `;
}

function upsertLiability(sql: Sql, userId: string, inputs: FinancialInputs) {
  return sql`
    INSERT INTO liabilities (
      id,
      user_id,
      name,
      liability_type,
      balance_cents,
      currency,
      annual_interest_bps,
      minimum_payment_cents,
      payoff_priority
    )
    VALUES (
      ${randomUUID()},
      ${userId},
      'Deuda principal',
      'personal_loan',
      ${inputs.loanBalanceCents},
      'CRC',
      ${inputs.annualInterestBps},
      ${inputs.minimumPaymentCents},
      1
    )
    ON CONFLICT (user_id, name) WHERE household_id IS NULL AND deleted_at IS NULL
    DO UPDATE SET
      liability_type = EXCLUDED.liability_type,
      balance_cents = EXCLUDED.balance_cents,
      currency = EXCLUDED.currency,
      annual_interest_bps = EXCLUDED.annual_interest_bps,
      minimum_payment_cents = EXCLUDED.minimum_payment_cents,
      payoff_priority = EXCLUDED.payoff_priority,
      updated_at = NOW()
  `;
}

function upsertGoal(sql: Sql, userId: string, inputs: FinancialInputs) {
  const assumptions = JSON.stringify({
    targetDownPaymentBps: inputs.targetDownPaymentBps,
    extraPaymentCents: inputs.extraPaymentCents,
  });

  return sql`
    INSERT INTO goals (
      id,
      user_id,
      name,
      goal_type,
      target_amount_cents,
      current_amount_cents,
      currency,
      priority,
      status,
      assumptions_json
    )
    VALUES (
      ${randomUUID()},
      ${userId},
      'Comprar casa',
      'buy_home',
      ${inputs.targetAmountCents},
      ${inputs.savingsCents},
      'CRC',
      1,
      'active',
      ${assumptions}::jsonb
    )
    ON CONFLICT (user_id, goal_type) WHERE household_id IS NULL AND deleted_at IS NULL
    DO UPDATE SET
      name = EXCLUDED.name,
      target_amount_cents = EXCLUDED.target_amount_cents,
      current_amount_cents = EXCLUDED.current_amount_cents,
      currency = EXCLUDED.currency,
      priority = EXCLUDED.priority,
      status = EXCLUDED.status,
      assumptions_json = EXCLUDED.assumptions_json,
      updated_at = NOW()
  `;
}

function parseAssumptions(value: Record<string, unknown> | string | null | undefined) {
  if (!value) {
    return {};
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  return value;
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}
