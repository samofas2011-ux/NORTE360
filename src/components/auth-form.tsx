"use client";

import { ArrowRight, LockKeyhole, Mountain } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "login" | "create";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("loading");

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    if (mode === "create" && payload.password !== payload.confirmPassword) {
      setError("Las contraseñas no coinciden."); setStatus("idle"); return;
    }
    const endpoint = mode === "create" ? "/api/auth/register" : "/api/auth/login";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();

      if (!response.ok) {
        setError(body.error ?? "No pudimos completar la solicitud.");
        setNeedsVerification(body.verificationRequired === true);
        return;
      }

      if (body.verificationRequired) { setConfirmation(body.message); return; }

      router.push("/app");
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setStatus("idle");
    }
  }

  const isCreate = mode === "create";

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <Link className="brand" href="/">
          <Mountain size={34} />
          <span>Norte360</span>
        </Link>
        <div className="auth-card">
          <div className="lock-mark">
            <LockKeyhole size={25} />
          </div>
          <p className="eyebrow">Acceso protegido</p>
          <h1>{isCreate ? "Crea tu cuenta" : "Inicia sesion"}</h1>
          <p>
            {isCreate
              ? "Guarda tu progreso y entra al primer mapa financiero de Norte360."
              : "Entra a tu Panorama, rutas y simuladores privados."}
          </p>

          {confirmation ? <div role="status"><h2>Confirma tu correo</h2><p>{confirmation}</p><p>El enlace vence en 30 minutos. Revisa también tu carpeta de spam.</p><Link className="solid-button" href="/account-action#purpose=verify">Reenviar confirmación</Link><p><Link href="/login">Volver a iniciar sesión</Link></p></div> : <form className="auth-form" onSubmit={submit}>
            {isCreate ? (
              <label>
                Nombre
                <input name="name" autoComplete="name" minLength={2} maxLength={120} required />
              </label>
            ) : null}
            <label>
              Email
              <input name="email" type="email" autoComplete="email" maxLength={254} required />
            </label>
            <label>
              Contraseña
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isCreate ? "new-password" : "current-password"}
                minLength={isCreate ? 15 : undefined}
                maxLength={isCreate ? 72 : 128}
                required
              />
              {isCreate ? <span>Mínimo 15 caracteres; máximo 72 bytes. Algunos símbolos y letras ocupan más de un byte.</span> : null}
            </label>
            {isCreate ? <label>Confirma tu contraseña<input name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={15} maxLength={72} required /></label> : null}
            <label className="check-line"><input type="checkbox" checked={showPassword} onChange={event=>setShowPassword(event.target.checked)} />Mostrar contraseña</label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            {needsVerification ? <Link href="/account-action#purpose=verify">Reenviar correo de confirmación</Link> : null}
            <button className="solid-button wide" type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Procesando…" : isCreate ? "Crear cuenta" : "Iniciar sesión"}
              <ArrowRight size={16} />
            </button>
          </form>}

          <p className="auth-switch">
            {!isCreate?<Link href="/account-action">Olvidé mi contraseña</Link>:null}{" "}
            {isCreate ? "Ya tienes cuenta?" : "Aun no tienes cuenta?"}{" "}
            <Link href={isCreate ? "/login" : "/create-account"}>
              {isCreate ? "Inicia sesion" : "Crea una cuenta"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
