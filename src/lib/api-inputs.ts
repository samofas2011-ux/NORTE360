import type { FinancialInputs } from "./financial-engine";
import type { GoalType } from "./product-db";
import { InputError } from "./product-api";

const GOAL_TYPES = new Set<GoalType>([
  "buy_home",
  "pay_debt",
  "emergency_fund",
  "retirement",
  "education",
  "buy_car",
  "build_wealth",
  "custom",
]);

export function normalizeFinancialInputs(value: unknown): FinancialInputs {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("Faltan los datos financieros.");
  const input = value as Record<string, unknown>;

  return {
    monthlyIncomeCents: nonNegativeInteger(input.monthlyIncomeCents),
    monthlyExpenseCents: nonNegativeInteger(input.monthlyExpenseCents),
    savingsCents: nonNegativeInteger(input.savingsCents),
    assetsCents: nonNegativeInteger(input.assetsCents),
    loanBalanceCents: nonNegativeInteger(input.loanBalanceCents),
    annualInterestBps: nonNegativeInteger(input.annualInterestBps, 100000),
    minimumPaymentCents: nonNegativeInteger(input.minimumPaymentCents),
    extraPaymentCents: nonNegativeInteger(input.extraPaymentCents),
    targetAmountCents: nonNegativeInteger(input.targetAmountCents),
    targetDownPaymentBps: nonNegativeInteger(input.targetDownPaymentBps, 10000),
  };
}

export function normalizeGoalType(value: unknown): GoalType {
  const goalType = String(value ?? "");
  if (!GOAL_TYPES.has(goalType as GoalType)) throw new InputError("Tipo de meta invalido.");
  return goalType as GoalType;
}

export function nonNegativeInteger(value: unknown, max = 10000000000000) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > max) {
    throw new InputError("Usa montos positivos y tasas dentro del rango permitido.");
  }
  return value;
}
