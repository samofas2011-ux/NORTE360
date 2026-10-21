"use client";
import { useEffect,useState } from "react";
import { Pencil,Trash2,Download } from "lucide-react";
import { requestJson } from "@/lib/client-api";
import { formatCRC } from "@/lib/financial-engine";
type Account={id:string;name:string;account_type:string;institution_name:string;balance_cents:string;include_in_net_worth:boolean};
type Transaction={id:string;account_id:string;description:string;category:string;amount_cents:string;transaction_date:string;account_name:string};
type Banking={accounts:Account[];imports:Array<{id:string;status:string;created_at:string}>;totals:{income:string;expense:string}};
type Page={rows:Transaction[];next:{date:string;id:string}|null};
const blankAccount={id:"",name:"",type:"checking",institution:"",balanceCents:0,includeInNetWorth:false};
const blankTransaction={id:"",accountId:"",description:"",category:"",amountCents:0,date:new Date().toISOString().slice(0,10)};
export function BankingPanel({onChange}:{onChange:()=>Promise<void>}){
  const [data,setData]=useState<Banking>({accounts:[],imports:[],totals:{income:"0",expense:"0"}});
  const [page,setPage]=useState<Page>({rows:[],next:null}),[account,setAccount]=useState(blankAccount),[transaction,setTransaction]=useState(blankTransaction);
  const [csv,setCsv]=useState(""),[importAccount,setImportAccount]=useState(""),[consent,setConsent]=useState(false),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  async function refresh(){const [bank,transactions]=await Promise.all([requestJson<Banking>("/api/banking"),requestJson<Page>("/api/transactions")]);setData(bank);setPage(transactions);}
  useEffect(()=>{void refresh().catch(error=>setMessage(error.message));},[]);
  async function act(action:()=>Promise<unknown>){setBusy(true);try{await action();await refresh();await onChange();setMessage("Cambios guardados.");}catch(error){setMessage(error instanceof Error?error.message:"No se pudo guardar.");}finally{setBusy(false);}}
  return <section className="panel record-panel banking-panel" id="cuentas">
    <h3>Cuentas y movimientos</h3><p role="status">{message}</p>
    <p>Ingresos registrados este mes: {formatCRC(Number(data.totals.income))} · Gastos registrados: {formatCRC(Number(data.totals.expense))}</p>
    <ul className="saved-records">{data.accounts.map(item=><li key={item.id}><span>{item.name}: {formatCRC(Number(item.balance_cents))}</span><div>
      <button aria-label={`Editar ${item.name}`} title="Editar cuenta" onClick={()=>setAccount({id:item.id,name:item.name,type:item.account_type,institution:item.institution_name||"",balanceCents:Number(item.balance_cents),includeInNetWorth:item.include_in_net_worth})}><Pencil size={16} aria-hidden="true"/></button>
      <button aria-label={`Archivar ${item.name}`} title="Archivar cuenta" disabled={busy} onClick={()=>{if(window.confirm("Archivar esta cuenta? Se conserva su historial."))void act(()=>requestJson("/api/banking","DELETE",{id:item.id}));}}><Trash2 size={16} aria-hidden="true"/></button>
    </div></li>)}</ul>
    <form onSubmit={event=>{event.preventDefault();void act(async()=>{await requestJson("/api/banking","PUT",{...account,id:account.id||undefined});setAccount(blankAccount);});}}>
      <div className="form-grid">
        <label>Nombre de cuenta<input required value={account.name} onChange={event=>setAccount({...account,name:event.target.value})}/></label>
        <label>Tipo de cuenta<select value={account.type} onChange={event=>setAccount({...account,type:event.target.value})}>{[["checking","Corriente"],["savings","Ahorro"],["cash","Efectivo"],["investment","Inversion"],["credit_card","Tarjeta"],["loan","Prestamo"]].map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>
        <label>Institucion<input value={account.institution} onChange={event=>setAccount({...account,institution:event.target.value})}/></label>
        <label>Saldo confirmado CRC<input type="number" step="0.01" required value={account.balanceCents/100} onChange={event=>setAccount({...account,balanceCents:Math.round(Number(event.target.value)*100)})}/></label>
      </div>
      <label className="check-line"><input type="checkbox" checked={account.includeInNetWorth} onChange={event=>setAccount({...account,includeInNetWorth:event.target.checked})}/>Incluir como activo en patrimonio; no lo he registrado ya en Activos.</label>
      <button disabled={busy} className="solid-button">{account.id?"Guardar cuenta":"Agregar cuenta"}</button>{account.id?<button type="button" onClick={()=>setAccount(blankAccount)}>Cancelar</button>:null}
    </form>
    <h4>Movimientos</h4><p>Los movimientos registran ingresos y gastos. El saldo confirmado de la cuenta se actualiza por separado.</p>
    <form onSubmit={event=>{event.preventDefault();void act(async()=>{await requestJson("/api/transactions","PUT",{...transaction,id:transaction.id||undefined});setTransaction(blankTransaction);});}}>
      <div className="form-grid">
        <label>Cuenta<select required value={transaction.accountId} onChange={event=>setTransaction({...transaction,accountId:event.target.value})}><option value="">Seleccionar</option>{data.accounts.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>Descripcion<input required value={transaction.description} onChange={event=>setTransaction({...transaction,description:event.target.value})}/></label>
        <label>Fecha<input required type="date" value={transaction.date} onChange={event=>setTransaction({...transaction,date:event.target.value})}/></label>
        <label>Monto CRC (gasto negativo)<input required type="number" step="0.01" value={transaction.amountCents/100} onChange={event=>setTransaction({...transaction,amountCents:Math.round(Number(event.target.value)*100)})}/></label>
        <label>Categoria<input value={transaction.category} onChange={event=>setTransaction({...transaction,category:event.target.value})}/></label>
      </div><button disabled={busy} className="solid-button">{transaction.id?"Guardar movimiento":"Agregar movimiento"}</button>{transaction.id?<button type="button" onClick={()=>setTransaction(blankTransaction)}>Cancelar</button>:null}
    </form>
    <ul className="saved-records">{page.rows.map(item=><li key={item.id}><span>{item.transaction_date} · {item.description} · {formatCRC(Number(item.amount_cents))}</span><div><button aria-label={`Editar ${item.description}`} title="Editar movimiento" onClick={()=>setTransaction({id:item.id,accountId:item.account_id,description:item.description,category:item.category||"",amountCents:Number(item.amount_cents),date:item.transaction_date})}><Pencil size={16} aria-hidden="true"/></button><button aria-label={`Eliminar ${item.description}`} title="Eliminar movimiento" disabled={busy} onClick={()=>{if(window.confirm("Eliminar este movimiento?"))void act(()=>requestJson("/api/transactions","DELETE",{id:item.id}));}}><Trash2 size={16} aria-hidden="true"/></button></div></li>)}</ul>
    {page.next?<button disabled={busy} onClick={async()=>{setBusy(true);try{const next=await requestJson<Page>("/api/transactions?"+new URLSearchParams(page.next!));setPage(current=>({rows:[...current.rows,...next.rows],next:next.next}));}catch(error){setMessage(String(error));}finally{setBusy(false);}}}>Cargar anteriores</button>:null}
    <h4>Importar CSV</h4>
    <a download="movimientos.csv" href={"data:text/csv;charset=utf-8,"+encodeURIComponent("date,description,amount,currency,category\n2026-09-01,Salario,1000000.00,CRC,Ingreso\n")}><Download size={16}/>Plantilla CSV</a>
    <form onSubmit={event=>{event.preventDefault();void act(async()=>{await requestJson("/api/imports","POST",{csv,accountId:importAccount,consent});setCsv("");setConsent(false);});}}>
      <label>Cuenta de importacion<select required value={importAccount} onChange={event=>setImportAccount(event.target.value)}><option value="">Seleccionar</option>{data.accounts.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <input type="file" accept=".csv,text/csv" aria-label="Archivo CSV" onChange={async event=>{const file=event.target.files?.[0];if(file&&file.size<=500000)setCsv(await file.text());else setMessage("El archivo debe ser CSV y menor de 500 KB.");}}/>
      <label className="check-line"><input type="checkbox" required checked={consent} onChange={event=>setConsent(event.target.checked)}/>Autorizo guardar estos movimientos en mi cuenta de Norte360.</label>
      <button disabled={busy||!csv||!consent} className="solid-button">Importar</button>
    </form>
    <ul className="saved-records">{data.imports.map(item=><li key={item.id}><span>CSV · {new Date(item.created_at).toLocaleDateString("es-CR")} · {item.status}</span><button disabled={busy} onClick={()=>void act(()=>requestJson("/api/imports","DELETE",{id:item.id,erase:false}))}>Revocar permiso</button><button aria-label="Eliminar movimientos importados" title="Eliminar movimientos importados" disabled={busy} onClick={()=>{if(window.confirm("Eliminar todos los movimientos de esta importacion?"))void act(()=>requestJson("/api/imports","DELETE",{id:item.id,erase:true}));}}><Trash2 size={16} aria-hidden="true"/></button></li>)}</ul>
  </section>;
}
