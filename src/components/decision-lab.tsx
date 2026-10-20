"use client";
import { requestResponse } from "@/lib/client-api";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { decisionTypes, type DecisionType, type DecisionResults } from "@/lib/decision-engine";
import { formatCRC } from "@/lib/financial-engine";
import type { SavedSimulation } from "@/lib/product-db";
export function DecisionLab({ simulations, onChange }: { simulations: SavedSimulation[]; onChange: () => Promise<void> }) {
  const [type, setType] = useState<DecisionType>("car_purchase");
  const [values, setValues] = useState<Record<string, number>>({});
  const [results, setResults] = useState<DecisionResults>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
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
  return <section className="panel">
    <h3>Mas decisiones</h3>
    <label>Decision<select value={type} onChange={event => { setType(event.target.value as DecisionType); setValues({}); setResults([]); }}>{Object.entries(decisionTypes).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <div className="form-grid">{decisionTypes[type].fields.map(([key,label]) => {
        const factor = key.endsWith("Cents") || key.endsWith("Bps") ? 100 : 1;
        return <label key={key}>{label}<input type="number" min={key === "termMonths" ? 1 : 0} step={factor === 100 ? "0.01" : "1"} required value={(values[key] ?? 0) / factor} onChange={event => setValues(current => ({ ...current, [key]: Math.round(Number(event.target.value) * factor) }))} /></label>;
      })}</div>
      {type === "invest_vs_debt" ? <p>Comparacion de un monto fijo con capitalizacion anual, sin aportes, impuestos ni comisiones. El retorno es un supuesto, no una garantia.</p> : null}
      <button className="solid-button" disabled={busy}>Calcular y guardar</button><p role="status">{message}</p>
    </form>
    <dl>{results.map(result => <div key={result.label}><dt>{result.label}</dt><dd>{result.unit === "money" ? formatCRC(result.value) : result.value}</dd></div>)}</dl>
    <ul className="saved-records">{simulations.filter(item => Object.hasOwn(decisionTypes, item.simulationType)).map(item => <li key={item.id}>
      <button onClick={() => { setType(item.simulationType as DecisionType); setValues(item.inputs as Record<string,number>); setResults((item.results.values ?? []) as DecisionResults); }}>{decisionTypes[item.simulationType as DecisionType].label} · {new Date(item.createdAt).toLocaleDateString("es-CR")}</button>
      <button disabled={busy} title="Eliminar simulacion" onClick={async () => {
        if (!window.confirm("Eliminar esta simulacion?")) return;
        setBusy(true);
        try { const response = await requestResponse(`/api/records/simulations/${item.id}`, { method: "DELETE" }); if (!response.ok) throw new Error(); await onChange(); } catch { setMessage("No se pudo eliminar."); } finally { setBusy(false); }
      }}><Trash2 size={16} /></button>
    </li>)}</ul>
  </section>;
}
