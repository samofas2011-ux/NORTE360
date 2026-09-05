import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Compass,
  Gauge,
  LockKeyhole,
  Mountain,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

const featureCards = [
  {
    icon: Gauge,
    title: "Mi Panorama",
    copy: "Ingresos, gastos, deudas, activos, ahorro, patrimonio y Norte Score en una vista clara.",
  },
  {
    icon: Target,
    title: "Mi Norte",
    copy: "Define metas como comprar casa, eliminar deudas, retiro o fondo de emergencia.",
  },
  {
    icon: Route,
    title: "Mis Rutas",
    copy: "Compara caminos rapidos, economicos, balanceados y seguros antes de comprometer dinero.",
  },
  {
    icon: Compass,
    title: "Decision Lab",
    copy: "Simula casa, carro, consolidacion de deuda, aguinaldo, salario e inversion vs deuda.",
  },
  {
    icon: Bot,
    title: "Norte360 Advisor",
    copy: "Explicaciones simples sobre resultados calculados por el motor financiero deterministico.",
  },
  {
    icon: Users,
    title: "Mi Familia",
    copy: "Una vision del hogar para coordinar metas compartidas, permisos y responsabilidades.",
  },
];

const roadmap = [
  "MVP con cuentas, Panorama, Norte Score y primer Norte",
  "Motor de rutas con escenarios guardados",
  "Decision Lab para decisiones grandes",
  "Inteligencia local Costa Rica: aguinaldo, quincena y marchamo",
  "Advisor con IA y guardrails financieros",
  "Familia, integraciones y marketplace cuando exista confianza",
];

export default function MarketingPage() {
  return (
    <main>
      <section className="hero-section sales-hero" id="inicio">
        <nav className="topbar" aria-label="Principal">
          <Link className="brand" href="/" aria-label="Norte360 inicio">
            <Mountain size={34} />
            <span>Norte360</span>
          </Link>
          <div className="toplinks">
            <a href="#producto">Producto</a>
            <a href="#seguridad">Seguridad</a>
            <a href="#roadmap">Roadmap</a>
            <a href="#precios">Precios</a>
          </div>
          <div className="top-actions">
            <Link className="quiet-button" href="/login">Iniciar sesion</Link>
            <Link className="solid-button" href="/create-account">
              Crear cuenta <ArrowRight size={16} />
            </Link>
          </div>
        </nav>

        <div className="hero-grid sales-grid">
          <div className="hero-copy">
            <p className="eyebrow">El Waze de tus finanzas</p>
            <h1>Decisiones de hoy, un mejor manana.</h1>
            <p>
              Norte360 te ayuda a entender donde estas, elegir tu destino y
              comparar rutas financieras antes de tomar decisiones importantes.
            </p>
            <div className="hero-actions">
              <Link className="solid-button" href="/create-account">
                Comenzar gratis <ArrowRight size={17} />
              </Link>
              <Link className="outline-button" href="/login">
                Ya tengo cuenta
              </Link>
            </div>
          </div>

          <aside className="login-face" aria-label="Acceso protegido">
            <div className="lock-mark">
              <LockKeyhole size={26} />
            </div>
            <h2>Tu mapa financiero vive detras de un login.</h2>
            <p>
              La web publica muestra el producto. Tu Panorama, rutas y datos
              personales solo aparecen despues de iniciar sesion.
            </p>
            <div className="login-face-actions">
              <Link className="solid-button wide" href="/create-account">Crear cuenta</Link>
              <Link className="quiet-button wide" href="/login">Iniciar sesion</Link>
            </div>
            <div className="security-list">
              <span><CheckCircle2 size={17} /> Passwords con hash bcrypt</span>
              <span><CheckCircle2 size={17} /> Cookie httpOnly de sesion</span>
              <span><CheckCircle2 size={17} /> App bloqueada sin cuenta</span>
            </div>
          </aside>
        </div>

        <div className="hero-metrics">
          <Feature icon={BarChart3} label="Diagnostica tu situacion" />
          <Feature icon={Compass} label="Explora posibilidades" />
          <Feature icon={Route} label="Recibe recomendaciones" />
          <Feature icon={ShieldCheck} label="Avanza con confianza" />
        </div>
      </section>

      <section className="sales-band" id="producto">
        <p className="eyebrow">Producto</p>
        <h2>Una aplicacion financiera para decidir antes de actuar.</h2>
        <div className="feature-grid">
          {featureCards.map(({ icon: Icon, title, copy }) => (
            <article key={title} className="feature-card">
              <Icon size={28} />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="sales-proof" id="seguridad">
        <div>
          <p className="eyebrow">Acceso seguro</p>
          <h2>El dashboard no se expone sin login.</h2>
          <p>
            Las rutas de aplicacion revisan la sesion en el servidor. La base de
            cuentas esta preparada para Postgres via `DATABASE_URL`, con un SQL
            inicial para crear usuarios y sesiones.
          </p>
        </div>
        <div className="proof-stack">
          <span><BadgeCheck size={20} /> Cuenta creada en backend</span>
          <span><BadgeCheck size={20} /> Password nunca se guarda en texto plano</span>
          <span><BadgeCheck size={20} /> Sesion revocable y expirable</span>
        </div>
      </section>

      <section className="roadmap sales-roadmap" id="roadmap">
        <p className="eyebrow">Roadmap</p>
        <h2>Construido por fases, desde confianza hasta automatizacion.</h2>
        <div className="roadmap-grid">
          {roadmap.map((item, index) => (
            <article key={item}>
              <strong>Fase {index + 1}</strong>
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="sales-band pricing-band" id="precios">
        <p className="eyebrow">Precios</p>
        <h2>Empieza gratis. Crece cuando tu Norte lo pida.</h2>
        <div className="pricing-grid">
          <article>
            <strong>Free</strong>
            <p>Panorama, primer Norte y una ruta base.</p>
          </article>
          <article>
            <strong>Plus</strong>
            <p>Escenarios guardados, Decision Lab y Advisor ampliado.</p>
          </article>
          <article>
            <strong>Family</strong>
            <p>Metas compartidas, permisos y vision del hogar.</p>
          </article>
        </div>
        <Link className="solid-button" href="/create-account">
          Crear mi cuenta <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}

function Feature({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="feature">
      <Icon size={28} />
      <span>{label}</span>
    </div>
  );
}
