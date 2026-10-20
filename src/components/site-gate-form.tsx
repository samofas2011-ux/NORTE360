"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SiteGateForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("loading");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/site-gate/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "Acceso no permitido.");
      setStatus("idle");
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next") || "/";
    const safeNext = next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/";
    router.push(safeNext + window.location.hash);
    router.refresh();
  }

  return (
    <form className="site-gate-card" onSubmit={submit}>
      <div className="lock-mark">
        <LockKeyhole size={24} />
      </div>
      <h2>Acceso privado</h2>
      <p>Entra con las credenciales temporales del equipo.</p>
      <label>
        Usuario
        <input name="username" autoComplete="username" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="solid-button wide" disabled={status === "loading"} type="submit">
        {status === "loading" ? "Verificando..." : "Entrar"}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
