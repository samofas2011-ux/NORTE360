export const appModuleIds = [
  "inicio",
  "mi-panorama",
  "mi-norte",
  "mis-rutas",
  "decisiones",
  "norte360-advisor",
  "mi-familia",
  "recursos",
  "notificaciones",
  "historial",
  "configuracion",
] as const;

export type AppModuleId = (typeof appModuleIds)[number];

const moduleSet = new Set<string>(appModuleIds);
const legacyModuleAliases: Record<string, AppModuleId> = {
  app: "inicio",
  "activos-deudas": "mi-panorama",
  cuentas: "mi-panorama",
};

export function resolveAppModule(hash: string): AppModuleId {
  const requested = hash.replace(/^#/, "");
  if (moduleSet.has(requested)) return requested as AppModuleId;
  return legacyModuleAliases[requested] ?? "inicio";
}
