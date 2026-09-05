import { NextResponse } from "next/server";
import { getCurrentSession, isSameOriginRequest } from "@/lib/auth";
import { getUserFinancialData, saveUserFinancialData } from "@/lib/product-db";
import type { FinancialInputs } from "@/lib/financial-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const data = await getUserFinancialData(session.user.id);
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  }

  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json();
  const inputs = normalizeFinancialInputs(body.inputs);
  const data = await saveUserFinancialData(session.user.id, inputs);

  return NextResponse.json(data);
}

function normalizeFinancialInputs(value: unknown): FinancialInputs {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

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

function nonNegativeInteger(value: unknown, max = Number.MAX_SAFE_INTEGER) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.min(Math.max(Math.round(numeric), 0), max);
}
