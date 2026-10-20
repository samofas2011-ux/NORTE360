import { productRequest, InputError } from "@/lib/product-api";
import { normalizeFinancialInputs, nonNegativeInteger } from "@/lib/api-inputs";
import { saveHomePurchaseSimulation } from "@/lib/product-db";
export const runtime = "nodejs";
export function POST(request: Request) {
  return productRequest(request, async (user, body) => {
    const inputs = normalizeFinancialInputs(body.inputs);
    if (!inputs.targetAmountCents) throw new InputError("Agrega el precio de la propiedad.");
    const termYears = nonNegativeInteger(body.termYears ?? 20, 40);
    if (termYears < 1) throw new InputError("El plazo debe ser de 1 a 40 anos.");
    return { simulations: await saveHomePurchaseSimulation(user.id, inputs, termYears) };
  });
}
