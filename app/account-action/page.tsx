"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Mountain } from "lucide-react";
import { requestJson } from "@/lib/client-api";

export default function AccountActionPage() {
  const [token, setToken] = useState("");
  const [purpose, setPurpose] = useState("reset");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    setToken(params.get("token") || "");
    setPurpose(params.get("purpose") === "verify" ? "verify" : "reset");
    window.history.replaceState(null, "", window.location.pathname);
    setReady(true);
  }, []);
  const verify = purpose === "verify";
  return <main className="auth-page"><section className="auth-shell">
    <Link className="brand" href="/"><Mountain size={30} />Norte360</Link>
    <div className="auth-card"><h1>{verify ? "Confirma tu correo" : "Recupera tu acceso"}</h1>
      <p>{token ? verify ? "Confirma tu dirección para activar tu cuenta. Después podrás iniciar sesión." : "Elige una nueva contraseña. Cerraremos tus sesiones anteriores." : verify ? "Solicita un nuevo enlace de confirmación." : "Te enviaremos un enlace para restablecer tu contraseña."}</p>
      {!done ? <form className="auth-form" onSubmit={async event => {
        event.preventDefault(); setError(""); setMessage("");
        const form = new FormData(event.currentTarget);
        if (token && !verify && form.get("password") !== form.get("confirmation")) { setError("Las contraseñas no coinciden."); return; }
        setBusy(true);
        try {
          const data = await requestJson<{ message: string }>("/api/account-action", "POST", token ? { token, purpose, password: form.get("password") } : { action: "request", purpose, email: form.get("email") });
          setMessage(data.message); setDone(true); setToken("");
        } catch (err) { setError(err instanceof Error ? err.message : "No pudimos completar la solicitud."); }
        finally { setBusy(false); }
      }}>
        {!token ? <label>Correo electrónico<input name="email" type="email" autoComplete="email" maxLength={254} required /></label> : !verify ? <><label>Nueva contraseña<input name="password" type="password" autoComplete="new-password" minLength={15} maxLength={72} required /><span>Mínimo 15 caracteres y máximo 72 bytes.</span></label><label>Confirma la nueva contraseña<input name="confirmation" type="password" autoComplete="new-password" minLength={15} maxLength={72} required /></label></> : null}
        <button disabled={!ready || busy} className="solid-button" type="submit">{busy ? "Procesando..." : token ? "Confirmar" : "Enviar enlace"}</button>
      </form> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      <p className="auth-switch"><Link href="/login">Iniciar sesión</Link></p>
      <p><a href={verify ? "/account-action#purpose=verify" : "/account-action"} onClick={() => { setToken(""); setDone(false); setError(""); setMessage(""); }}>Solicitar otro enlace</a></p>
    </div>
  </section></main>;
}
