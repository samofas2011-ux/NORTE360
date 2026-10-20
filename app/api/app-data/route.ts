import { productRequest } from "@/lib/product-api";
import { getFullAppData } from "@/lib/product-db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return productRequest(request, user => getFullAppData(user.id, user.name)); }
