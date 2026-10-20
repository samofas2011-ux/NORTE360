import { afterEach, describe, expect, it, vi } from "vitest";
import { requestJson } from "./client-api";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("product requests", () => {
  it("returns saved data and sends mutations only once", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ saved: true })));
    vi.stubGlobal("fetch", fetch);
    expect(await requestJson("/api/financial-profile", "PUT", { inputs: {} })).toEqual({ saved: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1].method).toBe("PUT");
  });
  it("surfaces authentication errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"error":"Inicia sesion para continuar."}', { status: 401 })));
    await expect(requestJson("/api/app-data")).rejects.toThrow("Inicia sesion");
  });
  it("rejects HTML instead of reporting a successful refresh", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Login</html>")));
    await expect(requestJson("/api/app-data")).rejects.toThrow("respuesta valida");
  });
  it("rejects empty successful responses with missing data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("")));
    await expect(requestJson("/api/app-data")).rejects.toThrow("datos incompletos");
  });
  for (const phase of ["headers", "body"]) {
    it(`times out stalled ${phase} without retrying an uncertain save`, async () => {
      vi.useFakeTimers();
      const fetch = vi.fn((_url, init) => {
        const stalled = new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
        return phase === "headers" ? stalled : Promise.resolve({ text: () => stalled });
      });
      vi.stubGlobal("fetch", fetch);
      const result = expect(requestJson("/api/financial-profile", "PUT", {})).rejects.toThrow("No pudimos confirmar el resultado");
      await vi.advanceTimersByTimeAsync(45000);
      await result;
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    });
  }
});
