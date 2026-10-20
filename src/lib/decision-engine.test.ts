import { describe, expect, it } from "vitest";
import { calculateDecision } from "./decision-engine";
import { calculatePayoff } from "./financial-engine";
describe("decision calculations", () => {
  it("includes financed fees and handles zero interest", () => {
    const result = calculateDecision("car_purchase", { priceCents: 1200000, downPaymentCents: 200000, feesCents: 200000, annualInterestBps: 0, termMonths: 12 });
    expect(result[0].value).toBe(100000);
    expect(result[2].value).toBe(0);
  });
  it("can report that consolidation costs more", () => {
    const result = calculateDecision("debt_consolidation", { balanceCents: 1200000, currentAnnualInterestBps: 0, currentPaymentCents: 100000, annualInterestBps: 1000, termMonths: 24, feesCents: 100000 });
    expect(result[3].value).toBeLessThan(0);
  });
  it("compares equal-rate investment and debt consistently", () => {
    const result = calculateDecision("invest_vs_debt", { amountCents: 1000000, annualInterestBps: 500, returnBps: 500, termMonths: 36 });
    expect(result[2].value).toBe(0);
  });
  it("rejects overallocated windfalls and negative inputs", () => {
    expect(() => calculateDecision("aguinaldo", { amountCents: 100, debtCents: 90, savingsCents: 50 })).toThrow();
    expect(() => calculateDecision("salary_change", { currentIncomeCents: -1, newIncomeCents: 1, expensesCents: 0 })).toThrow();
  });
  it("reports reduced disposable income", () => {
    const result = calculateDecision("salary_change", { currentIncomeCents: 100000, newIncomeCents: 90000, expensesCents: 95000 });
    expect(result[0].value).toBe(-10000);
    expect(result[1].value).toBe(-5000);
  });
  it("does not report a paid-off loan at the loop limit", () => {
    expect(() => calculatePayoff({ balanceCents: 1000000, annualInterestBps: 0, monthlyPaymentCents: 1 })).toThrow();
  });
});
