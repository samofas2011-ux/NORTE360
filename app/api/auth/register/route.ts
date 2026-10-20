import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createUser,
  DatabaseNotConfiguredError,
  findUserByEmail,
} from "@/lib/auth-db";
import {
  auditAuthEvent,
  checkAuthRateLimit,
  isSameOriginRequest,
  issueSessionCookie,
  normalizeEmail,
  validatePassword,
} from "@/lib/auth";
import { readAuthBody, validEmail } from "@/lib/auth-inputs";
import { emailConfigured } from "@/lib/email";
import { requestAccountAction } from "@/lib/account-lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
    }

    const body = await readAuthBody(request);
    const name = String(body.name ?? "").trim();
    const email = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");

    if (typeof body.name !== "string" || typeof body.email !== "string" || typeof body.password !== "string" || name.length < 2 || name.length > 120 || !validEmail(email)) {
      return NextResponse.json({ error: "Revisa tu nombre y email." }, { status: 400 });
    }

    if (!validatePassword(password)) {
      return NextResponse.json({ error: "Usa al menos 15 caracteres y un máximo de 72 bytes para tu contraseña." }, { status: 400 });
    }

    const allowed = await checkAuthRateLimit("register", request, email);
    if (!allowed) {
      await auditAuthEvent(request, "register_rate_limited", { metadata: { email_domain: email.split("@")[1] ?? "" } });
      return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo en unos minutos." }, { status: 429 });
    }

    const verificationRequired = emailConfigured();
    const existing = await findUserByEmail(email);
    if (existing) {
      await auditAuthEvent(request, "register_duplicate", { metadata: { email_domain: email.split("@")[1] ?? "" } });
      if (verificationRequired) {
        return NextResponse.json({ verificationRequired: true, message: "Revisa tu correo. Si ya tienes cuenta, inicia sesión o solicita un nuevo enlace de confirmación." }, { status: 202 });
      }
      return NextResponse.json({ error: "Ya existe una cuenta con ese email." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({
      id: randomUUID(),
      email,
      name,
      passwordHash,
      verificationRequired,
    });

    await auditAuthEvent(request, "register_success", { userId: user.id, metadata: { email_domain: email.split("@")[1] ?? "" } });
    if (!verificationRequired) {
      await issueSessionCookie(user.id, request);
      return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
    }
    try { await requestAccountAction(user.email, "verify"); }
    catch { return NextResponse.json({ verificationRequired: true, message: "Tu cuenta está pendiente de confirmación, pero no pudimos enviar el correo. Solicita un nuevo enlace." }, { status: 201 }); }
    return NextResponse.json({ verificationRequired: true, message: "Revisa tu correo y confirma tu dirección para activar la cuenta." }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return NextResponse.json({ verificationRequired: true, message: "Revisa tu correo o solicita un nuevo enlace de confirmación." }, { status: 202 });
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json(
        { error: "La base de datos aun no esta configurada. Conecta DATABASE_URL para activar registros." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "No pudimos crear la cuenta." }, { status: 500 });
  }
}
