import { NextResponse } from "next/server";
import { getCurrentSession, isSameOriginRequest } from "./auth";

export class InputError extends Error {
  readonly code = "INPUT_ERROR";
}

export async function productRequest(request: Request, action: (user: { id: string; name: string }, body: Record<string, unknown>) => Promise<unknown>, maxBytes = 16000) {
  if (request.method !== "GET" && !isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  }
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Inicia sesion para continuar." }, { status: 401 });
  try {
    let body: Record<string, unknown> = {};
    if (request.method !== "GET") {
      const raw = await request.text();
      if (raw.length > maxBytes) throw new InputError("La solicitud es demasiado grande.");
      body = raw ? JSON.parse(raw) : {};
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new InputError("Datos invalidos.");
    }
    return NextResponse.json(await action(session.user, body), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof InputError || error instanceof SyntaxError) {
      const message = error.message;
      return NextResponse.json({ error: error instanceof InputError ? message : "Datos invalidos." }, { status: 400 });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "Ya existe un registro con ese nombre. Edita el registro existente o usa otro nombre." }, { status: 409 });
    }
    console.error("Product operation failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "No se pudo completar la operacion. Intentalo de nuevo." }, { status: 500 });
  }
}
