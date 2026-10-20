"use client";
import { requestResponse } from "@/lib/client-api";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { LedgerItem } from "@/lib/ledger-db";
import { formatCRC } from "@/lib/financial-engine";

const labels: Record<string, string> = { cash: "Ahorro y efectivo", property: "Propiedad", vehicle: "Vehiculo", investment: "Inversion", retirement: "Retiro", business: "Negocio", other: "Otro", credit_card: "Tarjeta", mortgage: "Hipoteca", personal_loan: "Prestamo personal", car_loan: "Prestamo vehiculo", student_loan: "Prestamo educativo" };
const blank: LedgerItem = { id: "", name: "", kind: "assets", category: "cash", amountCents: 0, annualInterestBps: 0, minimumPaymentCents: 0 };

export function LedgerEditor({ items, onChange }: { items: LedgerItem[]; onChange: () => Promise<void> }) {
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(item: LedgerItem, method: "PUT" | "DELETE") {
    if (method === "DELETE" && !window.confirm("Eliminar este activo o deuda?")) return;
    setBusy(true);
    try {
      const response = await requestResponse("/api/ledger", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...item, id: item.id || undefined }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo guardar.");
      await onChange();
      setDraft(blank);
      setMessage(method === "DELETE" ? "Registro eliminado." : "Registro guardado.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar."); }
    finally { setBusy(false); }
  }
  return <section className="panel" id="activos-deudas">
    <h3>Activos y deudas</h3>
    <ul className="saved-records">{items.map(item => <li key={item.id}>
      <div><strong>{item.name}</strong><p>{labels[item.category]}: {formatCRC(item.amountCents)}{item.kind === "liabilities" ? ` · ${item.annualInterestBps / 100}% · ${formatCRC(item.minimumPaymentCents)}/mes` : ""}</p></div>
      <div><button disabled={busy} aria-label={`Editar ${item.name}`} title="Editar" onClick={() => setDraft(item)}><Pencil size={16} /></button><button disabled={busy} aria-label={`Eliminar ${item.name}`} title="Eliminar" onClick={() => void save(item, "DELETE")}><Trash2 size={16} /></button></div>
    </li>)}</ul>
    <form onSubmit={event => { event.preventDefault(); void save(draft, "PUT"); }}>
      <div className="form-grid">
        <label>Tipo<select disabled={Boolean(draft.id)} value={draft.kind} onChange={event => setDraft({ ...blank, kind: event.target.value as LedgerItem["kind"], category: event.target.value === "assets" ? "cash" : "personal_loan" })}><option value="assets">Activo</option><option value="liabilities">Deuda</option></select></label>
        <label>Nombre<input required maxLength={120} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
        <label>Categoria<select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}>{(draft.kind === "assets" ? ["cash","property","vehicle","investment","retirement","business","other"] : ["credit_card","mortgage","personal_loan","car_loan","student_loan","other"]).map(category => <option key={category} value={category}>{labels[category]}</option>)}</select></label>
        <label>Monto en CRC<input required type="number" min="0" step="0.01" value={draft.amountCents / 100} onChange={event => setDraft({ ...draft, amountCents: Math.round(Number(event.target.value) * 100) })} /></label>
        {draft.kind === "liabilities" ? <>
          <label>Tasa anual (%)<input required type="number" min="0" max="1000" step="0.01" value={draft.annualInterestBps / 100} onChange={event => setDraft({ ...draft, annualInterestBps: Math.round(Number(event.target.value) * 100) })} /></label>
          <label>Cuota mensual CRC<input required type="number" min="0" step="0.01" value={draft.minimumPaymentCents / 100} onChange={event => setDraft({ ...draft, minimumPaymentCents: Math.round(Number(event.target.value) * 100) })} /></label>
        </> : null}
      </div>
      <div className="save-row"><button className="solid-button" disabled={busy}>{draft.id ? "Guardar cambios" : "Agregar registro"}</button>{draft.id ? <button type="button" onClick={() => setDraft(blank)}>Cancelar</button> : null}<span role="status">{message}</span></div>
    </form>
  </section>;
}
