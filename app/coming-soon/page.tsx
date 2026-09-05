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
          <p className="eyebrow">Construccion privada</p>
          <h1>Norte360 esta en modo privado.</h1>
          <p>
            Estamos construyendo la aplicacion completa en segundo plano. Hasta
            que el producto este listo para salir, el sitio publico, el webapp y
            los flujos de cuenta permanecen protegidos para el equipo fundador.
          </p>
          <div className="coming-soon-points">
            <span><ShieldCheck size={18} /> Producto oculto hasta aprobacion</span>
            <span><LockKeyhole size={18} /> Acceso privado con credenciales</span>
          </div>
        </div>
        <SiteGateForm />
      </section>
    </main>
  );
}
