import { describe, expect, it } from "vitest";
import { resolveAppModule } from "./module-navigation";

describe("resolveAppModule", () => {
  it.each([
    ["#inicio", "inicio"],
    ["#mi-panorama", "mi-panorama"],
    ["#mi-norte", "mi-norte"],
    ["#mis-rutas", "mis-rutas"],
    ["#decisiones", "decisiones"],
    ["#norte360-advisor", "norte360-advisor"],
    ["#mi-familia", "mi-familia"],
    ["#recursos", "recursos"],
    ["#notificaciones", "notificaciones"],
    ["#historial", "historial"],
    ["#configuracion", "configuracion"],
  ])("opens %s as %s", (hash, expected) => {
    expect(resolveAppModule(hash)).toBe(expected);
  });

  it("keeps legacy panorama links working", () => {
    expect(resolveAppModule("#activos-deudas")).toBe("mi-panorama");
    expect(resolveAppModule("#cuentas")).toBe("mi-panorama");
  });

  it("falls back to Inicio for empty or unknown hashes", () => {
    expect(resolveAppModule("")).toBe("inicio");
    expect(resolveAppModule("#desconocido")).toBe("inicio");
  });
});
