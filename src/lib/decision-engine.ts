import { monthlyPayment, calculatePayoff } from "./financial-engine";

export const decisionTypes = {
  car_purchase: { label: "Comprar carro", fields: [["priceCents","Precio CRC"],["downPaymentCents","Prima CRC"],["annualInterestBps","Tasa anual %"],["termMonths","Plazo en meses"],["feesCents","Comisiones CRC"]] },
  debt_consolidation: { label: "Consolidar deuda", fields: [["balanceCents","Saldo actual CRC"],["currentAnnualInterestBps","Tasa actual %"],["currentPaymentCents","Cuota actual CRC"],["annualInterestBps","Nueva tasa anual %"],["termMonths","Nuevo plazo en meses"],["feesCents","Comisiones CRC"]] },
  invest_vs_debt: { label: "Invertir o pagar deuda", fields: [["amountCents","Monto disponible CRC"],["annualInterestBps","Tasa anual deuda %"],["returnBps","Retorno anual supuesto %"],["termMonths","Horizonte en meses"]] },
  salary_change: { label: "Cambio de salario", fields: [["currentIncomeCents","Ingreso neto actual CRC"],["newIncomeCents","Nuevo ingreso neto CRC"],["expensesCents","Gastos y cuotas CRC"]] },
  aguinaldo: { label: "Distribuir ingreso extraordinario", fields: [["amountCents","Monto neto recibido CRC"],["debtCents","Asignar a deuda CRC"],["savingsCents","Asignar a ahorro CRC"]] },
} as const;
export type DecisionType = keyof typeof decisionTypes;
export type DecisionResults = Array<{ label: string; value: number; unit: "money" | "months" }>;

export function calculateDecision(type: DecisionType, input: Record<string, number>): DecisionResults {
  const fields = decisionTypes[type]?.fields;
  if (!fields) throw new Error("Simulacion invalida.");
  for (const [key] of fields) {
    const value = input[key];
    const max = key.endsWith("Bps") ? 100000 : key === "termMonths" ? 600 : 10000000000000;
    if (!Number.isSafeInteger(value) || value < 0 || value > max) throw new Error("Revisa los montos, tasas y plazos.");
  }
  if ("termMonths" in input && input.termMonths < 1) throw new Error("El plazo debe ser mayor a cero.");
  const money = (label: string, value: number) => {
    if (!Number.isSafeInteger(Math.round(value))) throw new Error("El resultado excede el rango de calculo.");
    return { label, value: Math.round(value), unit: "money" as const };
  };
  if (type === "car_purchase") {
    if (input.downPaymentCents > input.priceCents) throw new Error("La prima no puede superar el precio.");
    const principal = input.priceCents - input.downPaymentCents + input.feesCents;
    const payment = monthlyPayment(principal, input.annualInterestBps, input.termMonths);
    return [money("Cuota mensual estimada", payment), money("Total de cuotas", payment * input.termMonths), money("Intereses estimados", payment * input.termMonths - principal)];
  }
  if (type === "debt_consolidation") {
    const current = calculatePayoff({ balanceCents: input.balanceCents, annualInterestBps: input.currentAnnualInterestBps, monthlyPaymentCents: input.currentPaymentCents });
    const principal = input.balanceCents + input.feesCents;
    const payment = monthlyPayment(principal, input.annualInterestBps, input.termMonths);
    return [money("Nueva cuota", payment), money("Costo actual pendiente", input.balanceCents + current.totalInterestCents), money("Nuevo total de cuotas", payment * input.termMonths), money("Diferencia a favor", input.balanceCents + current.totalInterestCents - payment * input.termMonths)];
  }
  if (type === "invest_vs_debt") {
    const years = input.termMonths / 12;
    const projectedGain = input.amountCents * (Math.pow(1 + input.returnBps / 10000, years) - 1);
    const debtCost = input.amountCents * (Math.pow(1 + input.annualInterestBps / 10000, years) - 1);
    return [money("Ganancia proyectada de inversion", projectedGain), money("Costo de mantener ese saldo de deuda", debtCost), money("Diferencia proyectada", projectedGain - debtCost)];
  }
  if (type === "salary_change") return [money("Cambio mensual", input.newIncomeCents - input.currentIncomeCents), money("Disponible mensual", input.newIncomeCents - input.expensesCents), money("Cambio anual", (input.newIncomeCents - input.currentIncomeCents) * 12)];
  if (input.debtCents + input.savingsCents > input.amountCents) throw new Error("La distribucion supera el monto recibido.");
  return [money("Para deuda", input.debtCents), money("Para ahorro", input.savingsCents), money("Sin asignar", input.amountCents - input.debtCents - input.savingsCents)];
}
