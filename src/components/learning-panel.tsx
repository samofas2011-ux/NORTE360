"use client";
import { useEffect,useState } from "react";
import { requestJson } from "@/lib/client-api";
type Resource={id:string;title:string;category:string;content:string|null;url:string|null;published_at:string|null;completed_at:string|null};
const blank={id:"",title:"",category:"Educacion",content:"",url:"",published:false};
export function LearningPanel(){
  const [resources,setResources]=useState<Resource[]>([]),[canManage,setCanManage]=useState(false),[draft,setDraft]=useState(blank),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  async function refresh(){const data=await requestJson<{resources:Resource[];canManage:boolean}>("/api/resources");setResources(data.resources);setCanManage(data.canManage);}
  useEffect(()=>{void refresh().catch(error=>setMessage(error.message));},[]);
  async function act(action:()=>Promise<unknown>){setBusy(true);try{await action();await refresh();}catch(error){setMessage(String(error));}finally{setBusy(false);}}
  return <section className="panel" id="recursos"><h3>Recursos y aprendizaje</h3><p role="status">{message}</p><div className="resource-grid">
    {resources.map(resource=><article key={resource.id}><h4>{resource.title}</h4><p>{resource.category}{resource.published_at?"":" · Borrador"}</p>{resource.content?<details><summary>Leer</summary><p style={{whiteSpace:"pre-wrap"}}>{resource.content}</p></details>:null}
      {resource.url&&resource.url.startsWith("https://")?<a href={resource.url} target="_blank" rel="noopener noreferrer">Abrir recurso</a>:null}
      {resource.published_at?<label className="check-line"><input type="checkbox" disabled={busy} checked={Boolean(resource.completed_at)} onChange={event=>void act(()=>requestJson("/api/resources","POST",{id:resource.id,completed:event.target.checked}))}/>Completado</label>:null}
      {canManage?<><button onClick={()=>setDraft({id:resource.id,title:resource.title,category:resource.category,content:resource.content||"",url:resource.url||"",published:Boolean(resource.published_at)})}>Editar</button><button disabled={busy} onClick={()=>void act(()=>requestJson("/api/resources","DELETE",{id:resource.id}))}>Retirar</button></>:null}
    </article>)}</div>
    {canManage?<form onSubmit={event=>{event.preventDefault();void act(async()=>{await requestJson("/api/resources","PUT",{...draft,id:draft.id||undefined});setDraft(blank);});}}><h4>Publicar recurso</h4><div className="form-grid"><label>Titulo<input required value={draft.title} onChange={event=>setDraft({...draft,title:event.target.value})}/></label><label>Categoria<input required value={draft.category} onChange={event=>setDraft({...draft,category:event.target.value})}/></label><label>Enlace HTTPS<input type="url" value={draft.url} onChange={event=>setDraft({...draft,url:event.target.value})}/></label></div><label>Contenido<textarea value={draft.content} onChange={event=>setDraft({...draft,content:event.target.value})}/></label><label className="check-line"><input type="checkbox" checked={draft.published} onChange={event=>setDraft({...draft,published:event.target.checked})}/>Publicado</label><button disabled={busy} className="solid-button">Guardar recurso</button></form>:null}
  </section>;
}
