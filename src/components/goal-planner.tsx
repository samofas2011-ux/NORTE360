"use client";
import { useEffect,useState } from "react";
import { Pencil,Trash2,Plus } from "lucide-react";
import { requestJson } from "@/lib/client-api";
import { formatCRC } from "@/lib/financial-engine";
type Goal={id:string;name:string;goal_type:string;household_id:string|null;target_amount_cents:string;current_amount_cents:string;monthly_allocation_cents:string;target_date:string|null;monthsToTarget:number|null;role:string};
const blank={id:"",name:"",type:"custom",householdId:"",targetCents:0,currentCents:0,allocationCents:0,date:""};
export function GoalPlanner({householdId,onChange}:{householdId:string|null;onChange:()=>Promise<void>}){
  const [goals,setGoals]=useState<Goal[]>([]),[draft,setDraft]=useState(blank),[contribution,setContribution]=useState({goalId:"",amountCents:0}),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function refresh(){setGoals((await requestJson<{goals:Goal[]}>("/api/planning")).goals);}
  useEffect(()=>{void refresh().catch(error=>setMessage(error.message));},[householdId]);
  async function act(action:()=>Promise<unknown>){setBusy(true);try{await action();await refresh();await onChange();setMessage("Meta actualizada.");}catch(error){setMessage(String(error));}finally{setBusy(false);}}
  return <section className="panel goal-planner-panel" id="mi-norte"><h3>Mi Norte y metas compartidas</h3><p role="status">{message}</p>
    <ul className="saved-records">{goals.map(goal=><li key={goal.id}><div><strong>{goal.name}{goal.household_id?" · Hogar":""}</strong><p>{formatCRC(Number(goal.current_amount_cents))} / {formatCRC(Number(goal.target_amount_cents))}</p><progress aria-label={`Avance de ${goal.name}`} max={Math.max(Number(goal.target_amount_cents),1)} value={Math.min(Number(goal.current_amount_cents),Number(goal.target_amount_cents))}/><p>{formatCRC(Number(goal.monthly_allocation_cents))}/mes · {goal.monthsToTarget===null?"Sin fecha estimada":goal.monthsToTarget+" meses estimados"}</p></div>
      {goal.role!=="viewer"?<div><button title="Editar meta" onClick={()=>setDraft({id:goal.id,name:goal.name,type:goal.goal_type,householdId:goal.household_id||"",targetCents:Number(goal.target_amount_cents),currentCents:Number(goal.current_amount_cents),allocationCents:Number(goal.monthly_allocation_cents),date:goal.target_date||""})}><Pencil size={16}/></button><button title="Registrar aporte" onClick={()=>setContribution({goalId:goal.id,amountCents:0})}><Plus size={16}/></button>{["owner","admin"].includes(goal.role)?<button title="Eliminar meta" disabled={busy} onClick={()=>{if(window.confirm("Eliminar esta meta?"))void act(()=>requestJson("/api/planning","DELETE",{id:goal.id}));}}><Trash2 size={16}/></button>:null}</div>:null}
    </li>)}</ul>
    <form onSubmit={event=>{event.preventDefault();void act(async()=>{await requestJson("/api/planning","PUT",{...draft,id:draft.id||undefined});setDraft(blank);});}}>
      <div className="form-grid"><label>Nombre de meta<input required value={draft.name} onChange={event=>setDraft({...draft,name:event.target.value})}/></label>
      <label>Destino<select value={draft.type} onChange={event=>setDraft({...draft,type:event.target.value})}>{[["buy_home","Casa"],["pay_debt","Deuda"],["emergency_fund","Emergencia"],["education","Educacion"],["retirement","Retiro"],["buy_car","Carro"],["build_wealth","Patrimonio"],["custom","Personalizada"]].map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>
      <label>Ambito<select disabled={Boolean(draft.id)} value={draft.householdId} onChange={event=>setDraft({...draft,householdId:event.target.value})}><option value="">Personal</option>{householdId?<option value={householdId}>Hogar</option>:null}</select></label>
      {([["targetCents","Objetivo CRC"],["allocationCents","Aporte mensual CRC"],["currentCents","Saldo inicial CRC"]] as const).map(([key,label])=><label key={key}>{label}<input disabled={key==="currentCents"&&Boolean(draft.id)} required type="number" min="0" step="0.01" value={draft[key]/100} onChange={event=>setDraft({...draft,[key]:Math.round(Number(event.target.value)*100)})}/></label>)}
      <label>Fecha deseada<input type="date" value={draft.date} onChange={event=>setDraft({...draft,date:event.target.value})}/></label></div>
      <button disabled={busy} className="solid-button">{draft.id?"Guardar meta":"Crear meta"}</button>{draft.id?<button type="button" onClick={()=>setDraft(blank)}>Cancelar</button>:null}
    </form>
    {contribution.goalId?<form onSubmit={event=>{event.preventDefault();void act(async()=>{await requestJson("/api/planning","POST",contribution);setContribution({goalId:"",amountCents:0});});}}><label>Aporte registrado CRC<input type="number" min="0.01" step="0.01" required value={contribution.amountCents/100} onChange={event=>setContribution({...contribution,amountCents:Math.round(Number(event.target.value)*100)})}/></label><button disabled={busy} className="solid-button">Registrar aporte</button><button type="button" onClick={()=>setContribution({goalId:"",amountCents:0})}>Cancelar</button></form>:null}
  </section>;
}
