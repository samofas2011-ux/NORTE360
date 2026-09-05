import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createSiteGateToken, SITE_GATE_COOKIE } from "@/lib/site-gate-token";
import { isSameOriginRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  }

  const configuredUser = process.env.SITE_GATE_USER;
  const configuredPasswordHash = getPasswordHash();
  const secret = process.env.SITE_GATE_SECRET;

  if (!configuredUser || !configuredPasswordHash || !secret) {
    return NextResponse.json({ error: "Acceso temporal no configurado." }, { status: 503 });
  }

  const body = await request.json();
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  const passwordMatches = await bcrypt.compare(password, configuredPasswordHash);

  if (username !== configuredUser || !passwordMatches) {
    return NextResponse.json({ error: "Usuario o password incorrecto." }, { status: 401 });
  }

  const gate = await createSiteGateToken(secret);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SITE_GATE_COOKIE, gate.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: gate.maxAge,
  });

  return response;
}

function getPasswordHash() {
  const encoded = process.env.SITE_GATE_PASSWORD_HASH_B64;
  if (encoded) {
    return Buffer.from(encoded, "base64").toString("utf8");
  }

  return process.env.SITE_GATE_PASSWORD_HASH;
}
