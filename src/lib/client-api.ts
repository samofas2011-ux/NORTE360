const REQUEST_TIMEOUT_MS = 45000;

/** Bound the entire response, including its body. Never retry mutations automatically. */
export async function requestResponse(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
    const text = await response.text();
    let data: unknown;
    try { data = text ? JSON.parse(text) : null; } catch {
      throw new Error("El servidor no devolvio una respuesta valida. Recarga la pagina y vuelve a iniciar sesion.");
    }
    if (!response.ok) {
      const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : null;
      throw new Error(message || (response.status === 401 ? "Tu sesion vencio. Vuelve a iniciar sesion." : "No se pudo completar la operacion. Intentalo de nuevo."));
    }
    if (response.status !== 204 && (data === null || typeof data !== "object")) {
      throw new Error("El servidor devolvio datos incompletos. Recarga la pagina.");
    }
    return new Response(response.status === 204 ? null : text, { status: response.status, headers: response.headers });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("La solicitud tardo demasiado. No pudimos confirmar el resultado. Recarga para comprobar tus datos antes de repetir la operacion.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function requestJson<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await requestResponse(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return response.json() as Promise<T>;
}
