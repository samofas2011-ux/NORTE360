import { productRequest } from "@/lib/product-api";
import { listLedger, writeLedger } from "@/lib/ledger-db";
export const runtime = "nodejs";
export function GET(request: Request) { return productRequest(request, async user => ({ items: await listLedger(user.id) })); }
export function PUT(request: Request) { return productRequest(request, async (user, body) => { await writeLedger(user.id, body); return { items: await listLedger(user.id) }; }); }
export function DELETE(request: Request) { return productRequest(request, async (user, body) => { await writeLedger(user.id, body, true); return { items: await listLedger(user.id) }; }); }
