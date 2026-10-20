import { productRequest, InputError } from "@/lib/product-api";
import { deleteProductRecord } from "@/lib/product-db";
export const runtime = "nodejs";
export async function DELETE(request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await context.params;
  return productRequest(request, async user => {
    if (!["goals", "scenarios", "simulations", "notifications"].includes(kind)) throw new InputError("Tipo de registro invalido.");
    await deleteProductRecord(user.id, kind, id);
    return { ok: true };
  });
}
