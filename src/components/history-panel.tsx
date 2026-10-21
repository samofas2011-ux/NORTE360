"use client";
import { useEffect,useState } from "react";
import { Trash2 } from "lucide-react";
import { requestJson } from "@/lib/client-api";
import { formatCRC } from "@/lib/financial-engine";
type Row={id:string;created_at:string;simulation_type?:string;name?:string;title?:string;content?:string;body?:string;results_json?:{paymentCents?:number;values?:Array<{label:string;value:number;unit:string}>;optimized?:{months:number};interestSavedCents?:number}};
const names:Record<string,string>={home_purchase:"Casa",car_purchase:"Carro",debt_consolidation:"Consolidacion",invest_vs_debt:"Inversion y deuda",salary_change:"Salario",aguinaldo:"Ingreso extraordinario"};
type Page={rows:Row[];next:{before:string;id:string}|null};
export function HistoryPanel({onChange}:{onChange:()=>Promise<void>}){
  const [kind,setKind]=useState("simulations"),[page,setPage]=useState<Page>({rows:[],next:null}),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>{let ignore=false;setPage({rows:[],next:null});void requestJson<Page>("/api/history?kind="+kind).then(data=>{if(!ignore)setPage(data);}).catch(error=>{if(!ignore)setMessage(error.message);});return()=>{ignore=true;};},[kind]);
  return <section className="panel history-panel" id="historial"><h3>Historial completo</h3><label>Tipo<select value={kind} onChange={event=>setKind(event.target.value)}><option value="simulations">Simulaciones</option><option value="scenarios">Rutas</option><option value="notifications">Notificaciones</option><option value="advisor_messages">Conversacion</option></select></label><p role="status">{message}</p>
    <ul className="saved-records">{page.rows.map(row=><li key={row.id}><details><summary>{row.name||row.title||(names[row.simulation_type||""]||"Conversacion")} · {new Date(row.created_at).toLocaleString("es-CR")}</summary>
      {row.content?<p>{row.content}</p>:null}{row.body?<p>{row.body}</p>:null}
      {row.results_json?.paymentCents!==undefined?<p>Cuota: {formatCRC(row.results_json.paymentCents)}</p>:null}
      {row.results_json?.values?.map(value=><p key={value.label}>{value.label}: {value.unit==="money"?formatCRC(value.value):value.value}</p>)}
      {row.results_json?.optimized?<p>Plazo: {row.results_json.optimized.months} meses · Interes evitado: {formatCRC(row.results_json.interestSavedCents||0)}</p>:null}
    </details>{kind!=="advisor_messages"?<button aria-label="Eliminar registro del historial" disabled={busy} title="Eliminar registro" onClick={async()=>{if(!window.confirm("Eliminar este registro?"))return;setBusy(true);try{await requestJson(`/api/records/${kind}/${row.id}`,"DELETE");setPage(current=>({...current,rows:current.rows.filter(item=>item.id!==row.id)}));await onChange();}catch(error){setMessage(String(error));}finally{setBusy(false);}}}><Trash2 size={16} aria-hidden="true"/></button>:null}</li>)}</ul>
    {page.next?<button disabled={busy} onClick={async()=>{setBusy(true);try{const data=await requestJson<Page>("/api/history?"+new URLSearchParams({kind,...page.next!}));setPage(current=>({rows:[...current.rows,...data.rows],next:data.next}));}catch(error){setMessage(String(error));}finally{setBusy(false);}}}>Cargar anteriores</button>:null}
  </section>;
}
