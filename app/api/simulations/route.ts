import { productRequest, InputError } from "@/lib/product-api";
import { decisionTypes, calculateDecision, type DecisionType } from "@/lib/decision-engine";
import { saveDecisionSimulation } from "@/lib/product-db";
export const runtime = "nodejs";
export function POST(request: Request) {
  return productRequest(request, async (user, body) => {
    if (typeof body.type !== "string" || !Object.hasOwn(decisionTypes, body.type)) throw new InputError("Tipo invalido.");
    if (!body.inputs || typeof body.inputs !== "object" || Array.isArray(body.inputs)) throw new InputError("Faltan los datos.");
    const type = body.type as DecisionType;
    const inputs = body.inputs as Record<string, number>;
    let results;
    try { results = calculateDecision(type, inputs); } catch (error) { throw new InputError(error instanceof Error ? error.message : "Datos invalidos."); }
    return { simulations: await saveDecisionSimulation(user.id, type, inputs, results), results };
  });
}
