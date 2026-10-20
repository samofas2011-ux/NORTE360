import { createHash, randomUUID } from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { listLedger, type LedgerItem } from "./ledger-db";
import { InputError } from "./product-api";
import type { DecisionType, DecisionResults } from "./decision-engine";
import { portfolioComparison } from "./portfolio-engine";
import { generateAdvisorAnswer } from "./advisor-ai";
import {
  buildFinancialSnapshot,
  compareExtraPaymentScenario,
  monthlyPayment,
  type FinancialInputs,
  type FinancialSnapshot,
  type RouteComparison,
} from "./financial-engine";

export type UserFinancialData = {
  inputs: FinancialInputs;
  hasSavedProfile: boolean;
  updatedAt: string | null;
};

export type GoalType =
  | "buy_home"
  | "pay_debt"
  | "emergency_fund"
  | "retirement"
  | "education"
  | "buy_car"
  | "build_wealth"
  | "custom";

export type AppGoal = {
  id: string;
  name: string;
  goalType: GoalType;
  targetAmountCents: number;
  currentAmountCents: number;
  targetDate: string | null;
  priority: number;
  status: "active" | "paused" | "completed" | "archived";
  assumptions: Record<string, unknown>;
  updatedAt: string;
};

export type RouteScenario = {
  id: string;
  name: string;
  scenarioType: "fast" | "economical" | "balanced" | "safe" | "custom";
  inputs: Record<string, unknown>;
  results: RouteComparison;
  updatedAt: string;
};

export type SavedSimulation = {
  id: string;
  simulationType: "home_purchase" | "car_purchase" | "refinance" | "debt_consolidation" | "invest_vs_debt" | "salary_change" | "aguinaldo" | "custom";
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  createdAt: string;
};

export type FamilySummary = {
  canManage: boolean;
  householdId: string | null;
  name: string;
  members: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    acceptedAt: string | null;
  }>;
  monthlyIncomeCents: number;
  monthlyExpenseCents: number;
  netWorthCents: number;
};

export type EducationalResource = {
  content: string | null;
  url: string | null;
  id: string;
  title: string;
  slug: string;
  resourceType: "article" | "video" | "guide";
  category: string;
  estimatedMinutes: number | null;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  notificationType: string;
  readAt: string | null;
  createdAt: string;
};

export type AdvisorMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type FullAppData = {
  invitations: Array<{ id: string; name: string }>;
  ledger: LedgerItem[];
  financialData: UserFinancialData;
  snapshot: FinancialSnapshot;
  goals: AppGoal[];
  routeScenarios: RouteScenario[];
  simulations: SavedSimulation[];
  family: FamilySummary;
  resources: EducationalResource[];
  notifications: AppNotification[];
  advisorMessages: AdvisorMessage[];
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

  return neon(url, { fetchOptions: { signal: AbortSignal.timeout(15000) } });
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
    SELECT monthly_income_cents, monthly_expense_cents, updated_at, planning_json
    FROM financial_profiles
    WHERE user_id = ${userId}
      AND household_id IS NULL
    ORDER BY updated_at DESC
    LIMIT 1
  `) as Array<{
    monthly_income_cents: string | number;
    monthly_expense_cents: string | number;
    planning_json: Record<string, unknown> | null;
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
      AND goal_type = 'buy_home'
      AND deleted_at IS NULL
    ORDER BY priority ASC, updated_at DESC
    LIMIT 1
  `) as Array<{
    target_amount_cents: string | number;
    assumptions_json: Record<string, unknown> | string | null;
  }>;

  const profile = profileRows[0];
  const accountRows = await sql`SELECT
    COALESCE(SUM(CASE WHEN a.account_type IN ('cash','checking','savings','wallet') THEN GREATEST(b.balance_cents,0) ELSE 0 END),0)::text cash,
    COALESCE(SUM(CASE WHEN a.account_type NOT IN ('cash','checking','savings','wallet') THEN GREATEST(b.balance_cents,0) ELSE 0 END),0)::text other
    FROM financial_accounts a JOIN LATERAL (SELECT balance_cents FROM account_balance_snapshots WHERE account_id=a.id ORDER BY captured_at DESC,id DESC LIMIT 1) b ON TRUE
    WHERE a.user_id=${userId} AND a.household_id IS NULL AND a.deleted_at IS NULL AND a.include_in_net_worth`;
  const assets = assetRows[0];
  const liabilities = liabilityRows[0];
  const goal = goalRows[0];
  const assumptions = { ...parseAssumptions(goal?.assumptions_json), ...parseJsonObject(profile?.planning_json) };

  return {
    inputs: {
      monthlyIncomeCents: toNumber(profile?.monthly_income_cents),
      monthlyExpenseCents: toNumber(profile?.monthly_expense_cents),
      savingsCents: toNumber(assets?.savings_cents) + toNumber(accountRows[0]?.cash),
      assetsCents: toNumber(assets?.assets_cents) + toNumber(accountRows[0]?.other),
      loanBalanceCents: toNumber(liabilities?.loan_balance_cents),
      annualInterestBps: toNumber(liabilities?.annual_interest_bps),
      minimumPaymentCents: toNumber(liabilities?.minimum_payment_cents),
      extraPaymentCents: toNumber(assumptions.extraPaymentCents),
      targetAmountCents: toNumber(assumptions.targetAmountCents ?? goal?.target_amount_cents),
      targetDownPaymentBps: assumptions.targetDownPaymentBps == null ? 2000 : toNumber(assumptions.targetDownPaymentBps),
    },
    hasSavedProfile: Boolean(profile),
    updatedAt: profile?.updated_at ?? null,
  };
}

export async function saveUserFinancialData(userId: string, inputs: FinancialInputs, preserveBalances = false) {
  const sql = getSql();

  await sql.transaction([
    upsertProfile(sql, userId, inputs),
    ...(preserveBalances ? [] : [
      upsertAsset(sql, userId, "Ahorro y efectivo", "cash", inputs.savingsCents),
      upsertAsset(sql, userId, "Activos adicionales", "other", inputs.assetsCents),
      upsertLiability(sql, userId, inputs),
    ]),
  ]);

  await ensureNotifications(sql, userId, buildFinancialSnapshot(inputs));

  return getUserFinancialData(userId);
}

export async function getFullAppData(userId: string, userName: string): Promise<FullAppData> {
  const sql = getSql();

  const financialData = await getUserFinancialData(userId);
  const snapshot = buildFinancialSnapshot(financialData.inputs);

  const [goals, routeScenarios, simulations, family, resources, notifications, advisorMessages] = await Promise.all([
    listGoals(sql, userId),
    listRouteScenarios(sql, userId),
    listSimulations(sql, userId),
    getFamilySummary(sql, userId, userName),
    listResources(sql),
    listNotifications(sql, userId),
    listAdvisorMessages(sql, userId),
  ]);

  return {
    invitations: await sql`SELECT hm.id, h.name FROM household_members hm JOIN households h ON h.id = hm.household_id WHERE hm.user_id = ${userId} AND hm.accepted_at IS NULL AND h.deleted_at IS NULL` as Array<{ id: string; name: string }>,
    ledger: await listLedger(userId),
    financialData,
    snapshot,
    goals,
    routeScenarios,
    simulations,
    family,
    resources,
    notifications,
    advisorMessages,
  };
}

export async function saveGoal(
  userId: string,
  goal: {
    id?: string;
    name: string;
    goalType: GoalType;
    targetAmountCents: number;
    currentAmountCents: number;
    targetDate?: string | null;
    priority?: number;
    assumptions?: Record<string, unknown>;
  },
) {
  const sql = getSql();
  const assumptions = JSON.stringify(goal.assumptions ?? {});
  if(goal.id && !(await sql`SELECT id FROM goals WHERE id=${goal.id} AND user_id=${userId} AND household_id IS NULL AND deleted_at IS NULL`).length)throw new InputError("Meta no disponible.");
  const rows = (await sql`
    INSERT INTO goals (
      id,
      user_id,
      name,
      goal_type,
      target_amount_cents,
      current_amount_cents,
      currency,
      target_date,
      priority,
      status,
      assumptions_json
    )
    VALUES (
      ${goal.id ?? randomUUID()},
      ${userId},
      ${goal.name},
      ${goal.goalType},
      ${goal.targetAmountCents},
      ${goal.currentAmountCents},
      'CRC',
      ${goal.targetDate ?? null},
      ${goal.priority ?? 1},
      'active',
      ${assumptions}::jsonb
    )
    ON CONFLICT (id)
    DO UPDATE SET
      name = EXCLUDED.name,
      target_amount_cents = EXCLUDED.target_amount_cents,
      current_amount_cents = EXCLUDED.current_amount_cents,
      target_date = EXCLUDED.target_date,
      priority = EXCLUDED.priority,
      status = EXCLUDED.status,
      assumptions_json = EXCLUDED.assumptions_json,
      updated_at = NOW()
    WHERE goals.user_id=${userId} AND goals.household_id IS NULL AND goals.deleted_at IS NULL
    RETURNING id
  `) as Array<{ id: string }>;

  return rows[0]?.id ?? null;
}

export async function saveRouteScenarios(userId: string, inputs: FinancialInputs) {
  const sql = getSql();
  const debts=(await listLedger(userId)).filter(item=>item.kind==="liabilities"&&item.amountCents>0).map(item=>({id:item.id,name:item.name,balanceCents:item.amountCents,annualInterestBps:item.annualInterestBps,minimumPaymentCents:item.minimumPaymentCents}));
  if(!debts.length)throw new InputError("Registra tus deudas antes de calcular rutas.");
  const available=Math.max(inputs.monthlyIncomeCents-inputs.monthlyExpenseCents-debts.reduce((sum,item)=>sum+item.minimumPaymentCents,0),0);
  const extra=Math.min(inputs.extraPaymentCents,available);
  const variants=[{name:"Ruta Rapida",scenarioType:"fast",extra,strategy:"snowball"},{name:"Ruta Economica",scenarioType:"economical",extra,strategy:"avalanche"},{name:"Ruta Balanceada",scenarioType:"balanced",extra:Math.round(extra*0.75),strategy:"avalanche"},{name:"Ruta Segura",scenarioType:"safe",extra:Math.min(extra,Math.max(Math.round(inputs.monthlyIncomeCents*0.8)-inputs.monthlyExpenseCents-debts.reduce((sum,d)=>sum+d.minimumPaymentCents,0),0)),strategy:"avalanche"}] as const;
  let scenarios;
  try{scenarios=variants.map(variant=>({...variant,inputs:{...inputs,debts,extraPaymentCents:variant.extra,strategy:variant.strategy},results:portfolioComparison(debts,variant.extra,variant.strategy)}));}
  catch(error){throw new InputError(error instanceof Error?error.message:"No se puede calcular la ruta.");}

  await sql.transaction(
    scenarios.map((scenario) => {
      const inputJson = JSON.stringify(scenario.inputs);
      const resultJson = JSON.stringify(scenario.results);
      return sql`
        INSERT INTO scenarios (id, user_id, name, scenario_type, inputs_json, results_json)
        VALUES (${randomUUID()}, ${userId}, ${scenario.name}, ${scenario.scenarioType}, ${inputJson}::jsonb, ${resultJson}::jsonb)
      `;
    }),
  );

  return listRouteScenarios(sql, userId);
}

export async function saveHomePurchaseSimulation(userId: string, inputs: FinancialInputs, termYears = 20) {
  const sql = getSql();
  const downPaymentCents = Math.round((inputs.targetAmountCents * inputs.targetDownPaymentBps) / 10000);
  const principalCents = Math.max(inputs.targetAmountCents - downPaymentCents, 0);
  const paymentCents = monthlyPayment(principalCents, inputs.annualInterestBps, termYears * 12);
  const simulationInputs = JSON.stringify({ ...inputs, termYears });
  const simulationResults = JSON.stringify({
    paymentCents,
    downPaymentCents,
    principalCents,
    termYears,
    affordable: inputs.monthlyIncomeCents > 0 && inputs.savingsCents >= downPaymentCents && paymentCents + inputs.minimumPaymentCents <= inputs.monthlyIncomeCents * 0.35 && paymentCents <= inputs.monthlyIncomeCents - inputs.monthlyExpenseCents - inputs.minimumPaymentCents,
  });
  const simulationId = randomUUID();
  const calculationId = randomUUID();

  await sql.transaction([
    sql`
      INSERT INTO simulations (id, user_id, simulation_type, inputs_json, results_json)
      VALUES (${simulationId}, ${userId}, 'home_purchase', ${simulationInputs}::jsonb, ${simulationResults}::jsonb)
    `,
    sql`
      INSERT INTO calculation_runs (id, user_id, simulation_id, engine_version, input_hash, inputs_json, outputs_json)
      VALUES (${calculationId}, ${userId}, ${simulationId}, 'norte360-financial-engine-v1', ${createHash("sha256").update(simulationInputs).digest("hex")}, ${simulationInputs}::jsonb, ${simulationResults}::jsonb)
    `,
  ]);

  return listSimulations(sql, userId);
}

export async function createAdvisorExchange(userId: string, question: string, inputs: FinancialInputs, useAI = false) {
  const sql = getSql();
  const conversationId = await getOrCreateAdvisorConversation(sql, userId);
  const snapshot = buildFinancialSnapshot(inputs);
  const route = safeCompareRoute(inputs);
  const answer = useAI ? await generateAdvisorAnswer(question,inputs,await listAdvisorMessages(sql,userId)) : buildAdvisorAnswer(question, snapshot, route, inputs);

  await sql.transaction([
    sql`
      INSERT INTO advisor_messages (id, conversation_id, user_id, role, content, metadata_json)
      VALUES (${randomUUID()}, ${conversationId}, ${userId}, 'user', ${question}, ${JSON.stringify({ source: "user" })}::jsonb)
    `,
    sql`
      INSERT INTO advisor_messages (id, conversation_id, user_id, role, content, metadata_json)
      VALUES (${randomUUID()}, ${conversationId}, ${userId}, 'assistant', ${answer}, ${JSON.stringify({ source: useAI ? "openai_responses" : "deterministic_advisor_v1" })}::jsonb)
    `,
    sql`UPDATE advisor_conversations SET updated_at = NOW() WHERE id = ${conversationId}`,
  ]);

  return listAdvisorMessages(sql, userId);
}

export async function saveDecisionSimulation(userId: string, type: DecisionType, inputs: Record<string, number>, results: DecisionResults) {
  const sql = getSql();
  const id = randomUUID();
  const inputJson = JSON.stringify(inputs);
  const outputJson = JSON.stringify({ values: results });
  await sql.transaction([
    sql`INSERT INTO simulations (id,user_id,simulation_type,inputs_json,results_json) VALUES (${id},${userId},${type},${inputJson}::jsonb,${outputJson}::jsonb)`,
    sql`INSERT INTO calculation_runs (id,user_id,simulation_id,engine_version,input_hash,inputs_json,outputs_json)
      VALUES (${randomUUID()},${userId},${id},'decision-engine-v1',${createHash("sha256").update(inputJson).digest("hex")},${inputJson}::jsonb,${outputJson}::jsonb)`,
  ]);
  return listSimulations(sql, userId);
}

export async function getOrCreateFamily(userId: string, userName: string) {
  const sql = getSql();
  return getFamilySummary(sql, userId, userName, true);
}

export async function markNotificationsRead(userId: string) {
  const sql = getSql();
  await sql`
    UPDATE notifications
    SET read_at = NOW()
    WHERE user_id = ${userId}
      AND read_at IS NULL
  `;

  return listNotifications(sql, userId);
}

export async function deleteProductRecord(userId: string, kind: string, id: string) {
  const sql = getSql();
  // Identifiers come exclusively from this allowlist; ownership is always bound.
  const tables: Record<string, string> = { goals: "goals", scenarios: "scenarios", simulations: "simulations", notifications: "notifications" };
  const table = tables[kind];
  if (!table) throw new Error("Unknown record kind");
  if (kind === "simulations" || kind === "scenarios") {
    const column = kind === "simulations" ? "simulation_id" : "scenario_id";
    await sql.transaction([
      sql.query(`DELETE FROM calculation_runs WHERE user_id = $1 AND ${column} = $2`, [userId, id]),
      sql.query(`DELETE FROM ${table} WHERE user_id = $1 AND id = $2 AND household_id IS NULL`, [userId, id]),
    ]);
  } else if (kind === "goals") {
    await sql`UPDATE goals SET deleted_at = NOW(), updated_at = NOW() WHERE id = ${id} AND user_id = ${userId} AND household_id IS NULL`;
  } else {
    await sql`DELETE FROM notifications WHERE id = ${id} AND user_id = ${userId}`;
  }
}

export async function clearAdvisor(userId: string) {
  await getSql()`DELETE FROM advisor_conversations WHERE user_id = ${userId} AND household_id IS NULL`;
}

export async function updateFamily(userId: string, name: string) {
  await getSql()`UPDATE households SET name = ${name}, updated_at = NOW() WHERE created_by_user_id = ${userId} AND deleted_at IS NULL`;
}

export async function deleteFamily(userId: string) {
  await getSql()`UPDATE households SET deleted_at = NOW(), updated_at = NOW() WHERE created_by_user_id = ${userId} AND deleted_at IS NULL`;
}

export async function inviteFamilyMember(userId: string, email: string) {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO household_members (id, household_id, user_id, role, invited_email)
    SELECT ${randomUUID()}, h.id, u.id, 'contributor', u.email
    FROM households h CROSS JOIN users u
    WHERE h.created_by_user_id = ${userId} AND h.deleted_at IS NULL
      AND u.email = ${email.trim().toLowerCase()} AND u.deleted_at IS NULL AND u.id <> ${userId}
    LIMIT 1
    ON CONFLICT (household_id, user_id) DO NOTHING RETURNING id
  `;
  if (!rows.length) throw new InputError("La invitacion requiere una cuenta registrada que no pertenezca ya al hogar.");
}

export async function acceptFamilyInvitation(userId: string, id: string) {
  const sql = getSql();
  const rows = await sql`UPDATE household_members hm SET accepted_at = NOW()
    FROM households h WHERE hm.id = ${id} AND hm.user_id = ${userId} AND hm.household_id = h.id
    AND hm.accepted_at IS NULL AND h.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM household_members other JOIN households oh ON oh.id = other.household_id WHERE other.user_id = ${userId} AND other.accepted_at IS NOT NULL AND oh.deleted_at IS NULL)
    RETURNING hm.id`;
  if (!rows.length) throw new InputError("Invitacion no disponible o ya tienes un hogar activo.");
}

export async function removeFamilyMember(userId: string, id: string) {
  await getSql()`DELETE FROM household_members hm USING households h
    WHERE hm.id = ${id} AND hm.household_id = h.id AND hm.role <> 'owner'
    AND (h.created_by_user_id = ${userId} OR hm.user_id = ${userId})`;
}

function upsertProfile(sql: Sql, userId: string, inputs: FinancialInputs) {
  return sql`
    INSERT INTO financial_profiles (
      id,
      user_id,
      default_currency,
      country_code,
      monthly_income_cents,
      monthly_expense_cents,
      planning_json
    )
    VALUES (
      ${randomUUID()},
      ${userId},
      'CRC',
      'CR',
      ${inputs.monthlyIncomeCents},
      ${inputs.monthlyExpenseCents},
      ${JSON.stringify({ extraPaymentCents: inputs.extraPaymentCents, targetAmountCents: inputs.targetAmountCents, targetDownPaymentBps: inputs.targetDownPaymentBps })}::jsonb
    )
    ON CONFLICT (user_id) WHERE household_id IS NULL
    DO UPDATE SET
      monthly_income_cents = EXCLUDED.monthly_income_cents,
      monthly_expense_cents = EXCLUDED.monthly_expense_cents,
      planning_json = EXCLUDED.planning_json,
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

async function listGoals(sql: Sql, userId: string): Promise<AppGoal[]> {
  const rows = (await sql`
    SELECT id, name, goal_type, target_amount_cents, current_amount_cents, target_date, priority, status, assumptions_json, updated_at
    FROM goals
    WHERE user_id = ${userId}
      AND household_id IS NULL
      AND deleted_at IS NULL
    ORDER BY priority ASC, updated_at DESC
  `) as Array<{
    id: string;
    name: string;
    goal_type: GoalType;
    target_amount_cents: string | number;
    current_amount_cents: string | number;
    target_date: string | null;
    priority: string | number;
    status: AppGoal["status"];
    assumptions_json: Record<string, unknown> | string | null;
    updated_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    goalType: row.goal_type,
    targetAmountCents: toNumber(row.target_amount_cents),
    currentAmountCents: toNumber(row.current_amount_cents),
    targetDate: row.target_date,
    priority: toNumber(row.priority),
    status: row.status,
    assumptions: parseAssumptions(row.assumptions_json),
    updatedAt: row.updated_at,
  }));
}

async function listRouteScenarios(sql: Sql, userId: string): Promise<RouteScenario[]> {
  const rows = (await sql`
    SELECT id, name, scenario_type, inputs_json, results_json, updated_at
    FROM scenarios
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 8
  `) as Array<{
    id: string;
    name: string;
    scenario_type: RouteScenario["scenarioType"];
    inputs_json: Record<string, unknown> | string;
    results_json: RouteComparison | string;
    updated_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    scenarioType: row.scenario_type,
    inputs: parseJsonObject(row.inputs_json),
    results: parseRouteComparison(row.results_json),
    updatedAt: row.updated_at,
  }));
}

async function listSimulations(sql: Sql, userId: string): Promise<SavedSimulation[]> {
  const rows = (await sql`
    SELECT id, simulation_type, inputs_json, results_json, created_at
    FROM simulations
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 8
  `) as Array<{
    id: string;
    simulation_type: SavedSimulation["simulationType"];
    inputs_json: Record<string, unknown> | string;
    results_json: Record<string, unknown> | string;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    simulationType: row.simulation_type,
    inputs: parseJsonObject(row.inputs_json),
    results: parseJsonObject(row.results_json),
    createdAt: row.created_at,
  }));
}

async function getFamilySummary(sql: Sql, userId: string, userName: string, createIfMissing = false): Promise<FamilySummary> {
  let householdRows = (await sql`
    SELECT h.id, h.name, h.created_by_user_id
    FROM households h
    INNER JOIN household_members hm ON hm.household_id = h.id
    WHERE hm.user_id = ${userId}
      AND hm.accepted_at IS NOT NULL
      AND h.deleted_at IS NULL
    ORDER BY h.created_at ASC
    LIMIT 1
  `) as Array<{ id: string; name: string; created_by_user_id: string }>;

  if (!householdRows[0] && createIfMissing) {
    const householdId = randomUUID();
    await sql.transaction([
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`,
      sql`
        INSERT INTO households (id, name, created_by_user_id)
        SELECT ${householdId}, ${`Familia de ${userName}`}, ${userId}
        WHERE NOT EXISTS (SELECT 1 FROM household_members hm JOIN households h ON h.id = hm.household_id WHERE hm.user_id = ${userId} AND hm.accepted_at IS NOT NULL AND h.deleted_at IS NULL)
      `,
      sql`
        INSERT INTO household_members (id, household_id, user_id, role, accepted_at)
        SELECT ${randomUUID()}, ${householdId}, ${userId}, 'owner', NOW()
        WHERE EXISTS (SELECT 1 FROM households WHERE id = ${householdId})
      `,
    ]);
    return getFamilySummary(sql, userId, userName);
  }

  const household = householdRows[0];
  if (!household) {
    return {
      canManage: false,
      householdId: null,
      name: "Mi Familia",
      members: [],
      monthlyIncomeCents: 0,
      monthlyExpenseCents: 0,
      netWorthCents: 0,
    };
  }

  const memberRows = (await sql`
    SELECT hm.id, hm.role, hm.accepted_at, u.name, u.email
    FROM household_members hm
    INNER JOIN users u ON u.id = hm.user_id
    WHERE hm.household_id = ${household.id}
    ORDER BY hm.created_at ASC
  `) as Array<{
    id: string;
    role: string;
    accepted_at: string | null;
    name: string;
    email: string;
  }>;

  const profileRows = (await sql`
    SELECT
      COALESCE(SUM(fp.monthly_income_cents), 0) AS income_cents,
      COALESCE(SUM(fp.monthly_expense_cents), 0) AS expense_cents
    FROM household_members hm
    INNER JOIN financial_profiles fp ON fp.user_id = hm.user_id AND fp.household_id IS NULL
    WHERE hm.household_id = ${household.id}
      AND hm.accepted_at IS NOT NULL
  `) as Array<{ income_cents: string | number; expense_cents: string | number }>;

  const netWorthRows = (await sql`
    SELECT
      COALESCE((SELECT SUM(value_cents) FROM assets WHERE household_id IS NULL AND user_id IN (SELECT user_id FROM household_members WHERE household_id = ${household.id} AND accepted_at IS NOT NULL) AND deleted_at IS NULL), 0)
      -
      COALESCE((SELECT SUM(balance_cents) FROM liabilities WHERE household_id IS NULL AND user_id IN (SELECT user_id FROM household_members WHERE household_id = ${household.id} AND accepted_at IS NOT NULL) AND deleted_at IS NULL), 0)
      AS net_worth_cents
  `) as Array<{ net_worth_cents: string | number }>;

  return {
    canManage: household.created_by_user_id === userId,
    householdId: household.id,
    name: household.name,
    members: memberRows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      acceptedAt: row.accepted_at,
    })),
    monthlyIncomeCents: toNumber(profileRows[0]?.income_cents),
    monthlyExpenseCents: toNumber(profileRows[0]?.expense_cents),
    netWorthCents: toNumber(netWorthRows[0]?.net_worth_cents),
  };
}

async function listResources(sql: Sql): Promise<EducationalResource[]> {
  const rows = (await sql`
    SELECT id, title, slug, resource_type, category, estimated_minutes, content, url
    FROM educational_resources
    WHERE country_code = 'CR'
      AND published_at <= NOW()
      AND (content IS NOT NULL OR url IS NOT NULL)
    ORDER BY published_at DESC NULLS LAST, created_at DESC
    LIMIT 12
  `) as Array<{
    id: string;
    title: string;
    slug: string;
    resource_type: EducationalResource["resourceType"];
    category: string;
    estimated_minutes: string | number | null;
    content: string | null;
    url: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    resourceType: row.resource_type,
    category: row.category,
    estimatedMinutes: row.estimated_minutes === null ? null : toNumber(row.estimated_minutes),
    content: row.content,
    url: row.url && /^https:\/\//.test(row.url) ? row.url : null,
  }));
}

async function listNotifications(sql: Sql, userId: string): Promise<AppNotification[]> {
  const rows = (await sql`
    SELECT id, title, body, notification_type, read_at, created_at
    FROM notifications
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 8
  `) as Array<{
    id: string;
    title: string;
    body: string;
    notification_type: string;
    read_at: string | null;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    notificationType: row.notification_type,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

async function listAdvisorMessages(sql: Sql, userId: string): Promise<AdvisorMessage[]> {
  const rows = (await sql`
    SELECT am.id, am.role, am.content, am.created_at
    FROM advisor_messages am
    INNER JOIN advisor_conversations ac ON ac.id = am.conversation_id
    WHERE ac.user_id = ${userId}
    ORDER BY am.created_at DESC, am.role ASC, am.id
    LIMIT 100
  `) as Array<{
    id: string;
    role: AdvisorMessage["role"];
    content: string;
    created_at: string;
  }>;

  return rows.reverse().map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }));
}

async function getOrCreateAdvisorConversation(sql: Sql, userId: string) {
  const rows = (await sql`
    SELECT id
    FROM advisor_conversations
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 1
  `) as Array<{ id: string }>;

  if (rows[0]) {
    return rows[0].id;
  }

  const id = randomUUID();
  await sql`
    INSERT INTO advisor_conversations (id, user_id, title)
    VALUES (${id}, ${userId}, 'Mi conversacion financiera')
  `;
  return id;
}

async function ensureNotifications(sql: Sql, userId: string, snapshot: FinancialSnapshot) {
  const recommendations: Array<{ type: string; title: string; body: string }> = [];

  if (snapshot.monthlySurplusCents <= 0) {
    recommendations.push({
      type: "negative_surplus",
      title: "Revisa tu flujo mensual",
      body: "Tus gastos estan al nivel de tus ingresos o por encima. Ajustar esta base mejora todas tus rutas.",
    });
  }

  if (snapshot.emergencyCoverageMonths < 3) {
    recommendations.push({
      type: "emergency_fund_low",
      title: "Fortalece tu fondo de emergencia",
      body: "Tu cobertura esta por debajo de 3 meses. Prioriza ahorro liquido antes de asumir mas riesgo.",
    });
  }

  if (snapshot.debtToIncomeBps > 2500) {
    recommendations.push({
      type: "debt_load_high",
      title: "Tu deuda pesa en el Panorama",
      body: "El pago minimo supera el 25% de tus ingresos. Una ruta de reduccion puede liberar flujo.",
    });
  }

  await Promise.all(
    recommendations.map(async (recommendation) => {
      const existing = (await sql`
        SELECT id
        FROM notifications
        WHERE user_id = ${userId}
          AND notification_type = ${recommendation.type}
          AND created_at > NOW() - INTERVAL '1 day'
        LIMIT 1
      `) as Array<{ id: string }>;

      if (!existing[0]) {
        await sql`
          INSERT INTO notifications (id, user_id, title, body, notification_type)
          VALUES (${createHash("sha256").update(userId + recommendation.type + new Date().toISOString().slice(0,10)).digest("hex")}, ${userId}, ${recommendation.title}, ${recommendation.body}, ${recommendation.type})
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }),
  );
}

function buildRouteScenarioRecords(inputs: FinancialInputs) {
  const variants = [
    { name: "Ruta Rapida", scenarioType: "fast" as const, extraMultiplier: 1.5 },
    { name: "Ruta Economica", scenarioType: "economical" as const, extraMultiplier: 1 },
    { name: "Ruta Balanceada", scenarioType: "balanced" as const, extraMultiplier: 0.75 },
    { name: "Ruta Segura", scenarioType: "safe" as const, extraMultiplier: 0.35 },
  ];

  return variants.map((variant) => {
    const variantInputs = {
      ...inputs,
      extraPaymentCents: Math.round(inputs.extraPaymentCents * variant.extraMultiplier),
    };

    return {
      name: variant.name,
      scenarioType: variant.scenarioType,
      inputs: variantInputs,
      results: safeCompareRoute(variantInputs),
    };
  });
}

function safeCompareRoute(inputs: FinancialInputs): RouteComparison {
  try {
    return compareExtraPaymentScenario(inputs);
  } catch {
    const currentYear = new Date().getFullYear();
    return {
      baseline: {
        months: 0,
        totalInterestCents: 0,
        debtFreeYear: currentYear,
        monthlyPaymentCents: inputs.minimumPaymentCents,
      },
      optimized: {
        months: 0,
        totalInterestCents: 0,
        debtFreeYear: currentYear,
        monthlyPaymentCents: inputs.minimumPaymentCents + inputs.extraPaymentCents,
      },
      monthsSaved: 0,
      yearsSaved: 0,
      interestSavedCents: 0,
    };
  }
}

function buildAdvisorAnswer(
  question: string,
  snapshot: FinancialSnapshot,
  route: RouteComparison,
  inputs: FinancialInputs,
) {
  const focus =
    snapshot.monthlySurplusCents <= 0
      ? "primero estabilizar tu flujo mensual"
      : snapshot.emergencyCoverageMonths < 3
        ? "subir tu fondo de emergencia antes de acelerar decisiones grandes"
        : inputs.loanBalanceCents > 0
          ? "comparar aportes extra contra tu deuda principal"
          : "convertir tu ahorro mensual en avance hacia tu meta principal";

  return `Con tus datos guardados, mi lectura es: conviene ${focus}. Tu Norte Score actual es ${snapshot.norteScore}/100. Si aplicas el aporte extra registrado, la ruta rapida podria ahorrar cerca de ${route.yearsSaved} anos y reducir intereses. Pregunta analizada: "${question.slice(0, 120)}"`;
}

function parseJsonObject(value: Record<string, unknown> | string | null | undefined): Record<string, unknown> {
  if (!value) {
    return {};
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return value;
}

function parseRouteComparison(value: RouteComparison | string): RouteComparison {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as RouteComparison;
  } catch {
    const currentYear = new Date().getFullYear();
    return {
      baseline: { months: 0, totalInterestCents: 0, debtFreeYear: currentYear, monthlyPaymentCents: 0 },
      optimized: { months: 0, totalInterestCents: 0, debtFreeYear: currentYear, monthlyPaymentCents: 0 },
      monthsSaved: 0,
      yearsSaved: 0,
      interestSavedCents: 0,
    };
  }
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
