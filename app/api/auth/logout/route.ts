import { NextResponse } from "next/server";
import { auditAuthEvent, clearSessionCookie, getCurrentSession, isSameOriginRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  }

  const session = await getCurrentSession();
  await clearSessionCookie();
  await auditAuthEvent(request, "logout", { userId: session?.user.id });
  return NextResponse.json({ ok: true });
}
