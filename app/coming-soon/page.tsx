import { Mountain, LockKeyhole, ShieldCheck } from "lucide-react";
import { SiteGateForm } from "@/components/site-gate-form";

export default function ComingSoonPage() {
  return (
    <main className="coming-soon-page">
      <section className="coming-soon-shell">
        <div className="coming-soon-copy">
          <a className="brand" href="/coming-soon" aria-label="Norte360">
            <Mountain size={34} />
            <span>Norte360</span>
          </a>
          <p className="eyebrow">Lanzamiento privado</p>
          <h1>Estamos preparando tu mapa financiero.</h1>
          <p>
            Norte360 esta en construccion. Por ahora el acceso completo al sitio
            y a la aplicacion esta reservado para el equipo fundador.
          </p>
          <div className="coming-soon-points">
            <span><ShieldCheck size={18} /> Website oculto hasta el lanzamiento</span>
            <span><LockKeyhole size={18} /> Acceso temporal protegido</span>
          </div>
        </div>
        <SiteGateForm />
      </section>
    </main>
  );
}
