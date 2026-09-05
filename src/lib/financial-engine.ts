export type FinancialInputs = {
  monthlyIncomeCents: number;
  monthlyExpenseCents: number;
  savingsCents: number;
  assetsCents: number;
  loanBalanceCents: number;
  annualInterestBps: number;
  minimumPaymentCents: number;
  extraPaymentCents: number;
  targetAmountCents: number;
  targetDownPaymentBps: number;
};

export type FinancialSnapshot = {
  monthlyIncomeCents: number;
  monthlyExpenseCents: number;
  monthlySurplusCents: number;
  loanBalanceCents: number;
  netWorthCents: number;
  debtToIncomeBps: number;
  emergencyCoverageMonths: number;
  estimatedHomePaymentCents: number;
  norteScore: number;
};

export type PayoffResult = {
  months: number;
  totalInterestCents: number;
  debtFreeYear: number;
  monthlyPaymentCents: number;
};

export type RouteComparison = {
  baseline: PayoffResult;
  optimized: PayoffResult;
  monthsSaved: number;
  yearsSaved: number;
  interestSavedCents: number;
};

const MONTHS_PER_YEAR = 12;

export function buildFinancialSnapshot(inputs: FinancialInputs): FinancialSnapshot {
  assertMoneyInputs(inputs);

  const monthlySurplusCents = inputs.monthlyIncomeCents - inputs.monthlyExpenseCents;
  const netWorthCents = inputs.assetsCents + inputs.savingsCents - inputs.loanBalanceCents;
  const debtToIncomeBps = Math.round((inputs.minimumPaymentCents / inputs.monthlyIncomeCents) * 10000);
  const emergencyCoverageMonths = roundToOne(inputs.savingsCents / Math.max(inputs.monthlyExpenseCents, 1));
  const downPaymentCents = Math.round((inputs.targetAmountCents * inputs.targetDownPaymentBps) / 10000);
  const financedCents = Math.max(inputs.targetAmountCents - downPaymentCents, 0);
  const estimatedHomePaymentCents = monthlyPayment(financedCents, inputs.annualInterestBps, 20 * MONTHS_PER_YEAR);

  return {
    monthlyIncomeCents: inputs.monthlyIncomeCents,
    monthlyExpenseCents: inputs.monthlyExpenseCents,
    monthlySurplusCents,
    loanBalanceCents: inputs.loanBalanceCents,
    netWorthCents,
    debtToIncomeBps,
    emergencyCoverageMonths,
    estimatedHomePaymentCents,
    norteScore: calculateNorteScore({ monthlySurplusCents, debtToIncomeBps, emergencyCoverageMonths, netWorthCents }),
  };
}

export function compareExtraPaymentScenario(inputs: FinancialInputs): RouteComparison {
  assertMoneyInputs(inputs);

  const baseline = calculatePayoff({
    balanceCents: inputs.loanBalanceCents,
    annualInterestBps: inputs.annualInterestBps,
    monthlyPaymentCents: inputs.minimumPaymentCents,
  });
  const optimized = calculatePayoff({
    balanceCents: inputs.loanBalanceCents,
    annualInterestBps: inputs.annualInterestBps,
    monthlyPaymentCents: inputs.minimumPaymentCents + inputs.extraPaymentCents,
  });
  const monthsSaved = Math.max(baseline.months - optimized.months, 0);

  return {
    baseline,
    optimized,
    monthsSaved,
    yearsSaved: Math.max(Math.round(monthsSaved / MONTHS_PER_YEAR), 0),
    interestSavedCents: Math.max(baseline.totalInterestCents - optimized.totalInterestCents, 0),
  };
}

export function calculatePayoff({
  balanceCents,
  annualInterestBps,
  monthlyPaymentCents,
}: {
  balanceCents: number;
  annualInterestBps: number;
  monthlyPaymentCents: number;
}): PayoffResult {
  if (balanceCents <= 0) {
    return { months: 0, totalInterestCents: 0, debtFreeYear: new Date().getFullYear(), monthlyPaymentCents };
  }

  const monthlyRate = annualInterestBps / 10000 / MONTHS_PER_YEAR;
  let balance = balanceCents;
  let months = 0;
  let totalInterestCents = 0;

  while (balance > 0 && months < 1200) {
    const interestCents = Math.round(balance * monthlyRate);
    if (monthlyPaymentCents <= interestCents) {
      throw new Error("Monthly payment must be greater than monthly interest.");
    }
    const principalCents = Math.min(monthlyPaymentCents - interestCents, balance);
    balance -= principalCents;
    totalInterestCents += interestCents;
    months += 1;
  }

  return {
    months,
    totalInterestCents,
    debtFreeYear: new Date().getFullYear() + Math.ceil(months / MONTHS_PER_YEAR),
    monthlyPaymentCents,
  };
}

export function monthlyPayment(principalCents: number, annualInterestBps: number, months: number): number {
  if (principalCents <= 0) return 0;
  if (months <= 0) throw new Error("Months must be greater than zero.");

  const monthlyRate = annualInterestBps / 10000 / MONTHS_PER_YEAR;
  if (monthlyRate === 0) return Math.ceil(principalCents / months);

  const payment = (principalCents * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  return Math.round(payment);
}

export function formatCRC(cents: number): string {
  const colones = Math.round(cents / 100);
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(colones);
}

function calculateNorteScore({
  monthlySurplusCents,
  debtToIncomeBps,
  emergencyCoverageMonths,
  netWorthCents,
}: {
  monthlySurplusCents: number;
  debtToIncomeBps: number;
  emergencyCoverageMonths: number;
  netWorthCents: number;
}) {
  const surplusScore = clamp(Math.round((monthlySurplusCents / 50000000) * 25), 0, 25);
  const dtiScore = clamp(25 - Math.round(debtToIncomeBps / 160), 0, 25);
  const emergencyScore = clamp(Math.round((emergencyCoverageMonths / 6) * 25), 0, 25);
  const netWorthScore = netWorthCents > 0 ? 22 : 8;
  return clamp(surplusScore + dtiScore + emergencyScore + netWorthScore, 1, 100);
}

function assertMoneyInputs(inputs: FinancialInputs) {
  const values = Object.entries(inputs);
  for (const [key, value] of values) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${key} must be a non-negative finite number.`);
    }
  }
  if (inputs.monthlyIncomeCents <= 0) {
    throw new Error("monthlyIncomeCents must be greater than zero.");
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundToOne(value: number) {
  return Math.round(value * 10) / 10;
}
