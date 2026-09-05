import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { DatabaseNotConfiguredError, ensureAuthSchema, findUserByEmail } from "@/lib/auth-db";
import { issueSessionCookie, normalizeEmail } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");

    await ensureAuthSchema();

    const user = await findUserByEmail(email);
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!user || !valid) {
      return NextResponse.json({ error: "Email o password incorrecto." }, { status: 401 });
    }

    await issueSessionCookie(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json(
        { error: "La base de datos aun no esta configurada. Conecta DATABASE_URL para activar login." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "No pudimos iniciar sesion." }, { status: 500 });
  }
}
