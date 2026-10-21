"use client";
import { requestResponse } from "@/lib/client-api";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { decisionTypes, type DecisionType, type DecisionResults } from "@/lib/decision-engine";
import { formatCRC } from "@/lib/financial-engine";
import type { SavedSimulation } from "@/lib/product-db";
export function DecisionLab({ simulations, onChange, type, onTypeChange }: { simulations: SavedSimulation[]; onChange: () => Promise<void>; type: DecisionType; onTypeChange: (type: DecisionType) => void }) {
  const [values, setValues] = useState<Record<string, number>>({});
  const [results, setResults] = useState<DecisionResults>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setValues({});
    setResults([]);
  }, [type]);
  async function save() {
    setBusy(true);
    try {
      const inputs = Object.fromEntries(decisionTypes[type].fields.map(([key]) => [key, values[key] ?? 0]));
      const response = await requestResponse("/api/simulations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, inputs }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setResults(body.results);
      await onChange();
      setMessage("Simulacion guardada.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar."); }
    finally { setBusy(false); }
  }
  return <section className="panel decision-lab-panel">
    <p className="eyebrow">Configura tu escenario</p>
    <h3>{decisionTypes[type].label}</h3>
    <div className="decision-workbench">
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <h4>{decisionTypes[type].label}</h4>
      <div className="form-grid">{decisionTypes[type].fields.map(([key,label]) => {
        const factor = key.endsWith("Cents") || key.endsWith("Bps") ? 100 : 1;
        return <label key={key}>{label}<input type="number" min={key === "termMonths" ? 1 : 0} step={factor === 100 ? "0.01" : "1"} required value={(values[key] ?? 0) / factor} onChange={event => setValues(current => ({ ...current, [key]: Math.round(Number(event.target.value) * factor) }))} /></label>;
      })}</div>
      {type === "invest_vs_debt" ? <p>Comparacion de un monto fijo con capitalizacion anual, sin aportes, impuestos ni comisiones. El retorno es un supuesto, no una garantia.</p> : null}
      <button className="solid-button" disabled={busy}>Calcular y guardar</button><p role="status">{message}</p>
    </form>
    <aside className="decision-result-panel" aria-live="polite">
      <p className="eyebrow">Resultado del escenario</p>
      <h4>{results.length ? "Compara el impacto" : "Completa los datos para calcular"}</h4>
      {results.length ? <dl>{results.map(result => <div key={result.label}><dt>{result.label}</dt><dd>{result.unit === "money" ? formatCRC(result.value) : result.value}</dd></div>)}</dl> : <p>Los resultados aparecerán aquí con los supuestos y limitaciones de esta decisión.</p>}
    </aside>
    </div>
    <h4 className="saved-scenarios-title">Escenarios guardados</h4>
    <ul className="saved-records">{simulations.filter(item => Object.hasOwn(decisionTypes, item.simulationType)).map(item => <li key={item.id}>
      <button onClick={() => { onTypeChange(item.simulationType as DecisionType); window.setTimeout(() => { setValues(item.inputs as Record<string,number>); setResults((item.results.values ?? []) as DecisionResults); }); }}>{decisionTypes[item.simulationType as DecisionType].label} · {new Date(item.createdAt).toLocaleDateString("es-CR")}</button>
      <button aria-label="Eliminar simulación" disabled={busy} title="Eliminar simulación" onClick={async () => {
        if (!window.confirm("Eliminar esta simulacion?")) return;
        setBusy(true);
        try { const response = await requestResponse(`/api/records/simulations/${item.id}`, { method: "DELETE" }); if (!response.ok) throw new Error(); await onChange(); } catch { setMessage("No se pudo eliminar."); } finally { setBusy(false); }
      }}><Trash2 size={16} aria-hidden="true" /></button>
    </li>)}</ul>
  </section>;
}
