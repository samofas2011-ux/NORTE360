import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createUser,
  DatabaseNotConfiguredError,
  ensureAuthSchema,
  findUserByEmail,
} from "@/lib/auth-db";
import { issueSessionCookie, normalizeEmail, validatePassword } from "@/lib/auth";
import { auditAuthEvent, checkAuthRateLimit, isSameOriginRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
    }

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");

    if (name.length < 2 || !email.includes("@")) {
      return NextResponse.json({ error: "Revisa tu nombre y email." }, { status: 400 });
    }

    if (!validatePassword(password)) {
      return NextResponse.json({ error: "El password debe tener entre 15 y 128 caracteres." }, { status: 400 });
    }

    await ensureAuthSchema();

    const allowed = await checkAuthRateLimit("register", request, email);
    if (!allowed) {
      await auditAuthEvent(request, "register_rate_limited", { metadata: { email_domain: email.split("@")[1] ?? "" } });
      return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo en unos minutos." }, { status: 429 });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      await auditAuthEvent(request, "register_duplicate", { metadata: { email_domain: email.split("@")[1] ?? "" } });
      return NextResponse.json({ error: "Ya existe una cuenta con ese email." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({
      id: randomUUID(),
      email,
      name,
      passwordHash,
    });

    await issueSessionCookie(user.id, request);
    await auditAuthEvent(request, "register_success", { userId: user.id, metadata: { email_domain: email.split("@")[1] ?? "" } });
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json(
        { error: "La base de datos aun no esta configurada. Conecta DATABASE_URL para activar registros." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "No pudimos crear la cuenta." }, { status: 500 });
  }
}
