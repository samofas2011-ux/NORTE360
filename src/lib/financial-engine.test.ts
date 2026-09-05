import { describe, expect, it } from "vitest";
import {
  buildFinancialSnapshot,
  calculatePayoff,
  compareExtraPaymentScenario,
  monthlyPayment,
  type FinancialInputs,
} from "./financial-engine";

const inputs: FinancialInputs = {
  monthlyIncomeCents: 180000000,
  monthlyExpenseCents: 105000000,
  savingsCents: 32000000,
  assetsCents: 1840000000,
  loanBalanceCents: 620000000,
  annualInterestBps: 750,
  minimumPaymentCents: 16000000,
  extraPaymentCents: 4500000,
  targetAmountCents: 8000000000,
  targetDownPaymentBps: 2000,
};

describe("financial engine", () => {
  it("calculates core financial snapshot metrics from cents", () => {
    const snapshot = buildFinancialSnapshot(inputs);

    expect(snapshot.monthlySurplusCents).toBe(75000000);
    expect(snapshot.netWorthCents).toBe(1252000000);
    expect(snapshot.debtToIncomeBps).toBe(889);
    expect(snapshot.norteScore).toBeGreaterThan(50);
  });

  it("calculates amortized monthly payment", () => {
    const payment = monthlyPayment(6400000000, 750, 240);

    expect(payment).toBeGreaterThan(51000000);
    expect(payment).toBeLessThan(53000000);
  });

  it("shows that extra payments improve the route", () => {
    const comparison = compareExtraPaymentScenario(inputs);

    expect(comparison.optimized.months).toBeLessThan(comparison.baseline.months);
    expect(comparison.interestSavedCents).toBeGreaterThan(0);
  });

  it("rejects payments that do not cover monthly interest", () => {
    expect(() =>
      calculatePayoff({
        balanceCents: 100000000,
        annualInterestBps: 3600,
        monthlyPaymentCents: 100000,
      }),
    ).toThrow("Monthly payment must be greater than monthly interest.");
  });
});
