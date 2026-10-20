import { productRequest } from "@/lib/product-api";
import { normalizeFinancialInputs } from "@/lib/api-inputs";
import { getUserFinancialData, saveUserFinancialData } from "@/lib/product-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return productRequest(request, user => getUserFinancialData(user.id)); }
export function PUT(request: Request) { return productRequest(request, (user, body) => saveUserFinancialData(user.id, normalizeFinancialInputs(body.inputs), true)); }
