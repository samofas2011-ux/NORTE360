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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("loading");

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
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
        return;
      }

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

          <form className="auth-form" onSubmit={submit}>
            {isCreate ? (
              <label>
                Nombre
                <input name="name" autoComplete="name" minLength={2} required />
              </label>
            ) : null}
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={isCreate ? "new-password" : "current-password"}
                minLength={15}
                required
              />
              {isCreate ? <span>Minimo 15 caracteres.</span> : null}
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="solid-button wide" type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Procesando..." : isCreate ? "Crear cuenta" : "Iniciar sesion"}
              <ArrowRight size={16} />
            </button>
          </form>

          <p className="auth-switch">
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
