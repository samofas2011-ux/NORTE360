import { productRequest, InputError } from "@/lib/product-api";
import { nonNegativeInteger, normalizeGoalType } from "@/lib/api-inputs";
import { getFullAppData, saveGoal } from "@/lib/product-db";
export const runtime = "nodejs";
export function POST(request: Request) {
  return productRequest(request, async (user, body) => {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 120) throw new InputError("Escribe un nombre de hasta 120 caracteres.");
    const date = body.targetDate;
    if (date != null && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date)) throw new InputError("Fecha invalida.");
    await saveGoal(user.id, {
      id: typeof body.id==="string"?body.id:undefined,
      name, goalType: normalizeGoalType(body.goalType),
      targetAmountCents: nonNegativeInteger(body.targetAmountCents),
      currentAmountCents: nonNegativeInteger(body.currentAmountCents),
      targetDate: date as string | null | undefined,
      priority: nonNegativeInteger(body.priority ?? 1, 100) || 1,
      assumptions: { targetDownPaymentBps: nonNegativeInteger((body.assumptions as Record<string, unknown>)?.targetDownPaymentBps ?? 2000, 10000), extraPaymentCents: nonNegativeInteger((body.assumptions as Record<string, unknown>)?.extraPaymentCents ?? 0) },
    });
    return getFullAppData(user.id, user.name);
  });
}
