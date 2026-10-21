"use client";
import { useEffect,useState } from "react";
import { Download } from "lucide-react";
import { requestJson } from "@/lib/client-api";
export function AccountSettings(){
  const [account,setAccount]=useState<{email:string;email_verified_at:string|null;emailReady:boolean}>(),[password,setPassword]=useState(""),[newPassword,setNewPassword]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>{void requestJson<typeof account>("/api/account").then(setAccount).catch(error=>setMessage(error.message));},[]);
  async function act(action:()=>Promise<void>){setBusy(true);try{await action();}catch(error){setMessage(String(error));}finally{setBusy(false);}}
  return <section className="panel account-settings-panel" id="configuracion"><h3>Mi cuenta</h3><p>{account?.email} · {account?.email_verified_at?"Verificado":"Sin verificar"}</p><p role="status">{message}</p>
    <button disabled={busy||!account?.emailReady||Boolean(account?.email_verified_at)} onClick={()=>void act(async()=>{await requestJson("/api/account","POST",{action:"verify"});setMessage("Enlace de verificacion enviado.");})}>Verificar email</button>
    <button disabled={busy} onClick={()=>void act(async()=>{const data=await requestJson("/api/account?export=true");const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="norte360-datos.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);})}><Download size={16}/>Exportar mis datos</button>
    <form onSubmit={event=>{event.preventDefault();void act(async()=>{await requestJson("/api/account","POST",{action:"password",currentPassword:password,newPassword});window.location.href="/login";});}}>
      <label>Password actual<input type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)}/></label>
      <label>Nuevo password<input type="password" autoComplete="new-password" minLength={15} maxLength={128} required value={newPassword} onChange={event=>setNewPassword(event.target.value)}/></label>
      <button disabled={busy} className="solid-button">Cambiar password y cerrar sesiones</button>
    </form>
    <button disabled={busy||!password} onClick={()=>{if(window.confirm("Eliminar permanentemente tu cuenta y tus datos personales? Esta accion no se puede deshacer."))void act(async()=>{await requestJson("/api/account","DELETE",{password});window.location.href="/coming-soon";});}}>Eliminar mi cuenta y datos</button>
  </section>;
}
