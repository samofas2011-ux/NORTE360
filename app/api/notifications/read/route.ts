import { productRequest } from "@/lib/product-api";
import { markNotificationsRead } from "@/lib/product-db";
export const runtime = "nodejs";
export function POST(request: Request) { return productRequest(request, async user => ({ notifications: await markNotificationsRead(user.id) })); }
