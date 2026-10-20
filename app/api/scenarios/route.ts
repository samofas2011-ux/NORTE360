import { productRequest, InputError } from "@/lib/product-api";
import { normalizeFinancialInputs } from "@/lib/api-inputs";
import { saveRouteScenarios } from "@/lib/product-db";
import { compareExtraPaymentScenario } from "@/lib/financial-engine";
export const runtime = "nodejs";
export function POST(request: Request) {
  return productRequest(request, async (user, body) => {
    const inputs = normalizeFinancialInputs(body.inputs);
    if (!inputs.loanBalanceCents) throw new InputError("Agrega una deuda para comparar rutas.");
    try { compareExtraPaymentScenario(inputs); } catch { throw new InputError("El pago minimo debe superar los intereses mensuales y cancelar la deuda en 100 anos."); }
    return { routeScenarios: await saveRouteScenarios(user.id, inputs) };
  });
}
