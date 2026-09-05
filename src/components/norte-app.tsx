"use client";

import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Car,
  CheckCircle2,
  CircleDollarSign,
  Compass,
  CreditCard,
  Gauge,
  Home,
  Landmark,
  LineChart,
  Menu,
  Mountain,
  PiggyBank,
  Plus,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  buildFinancialSnapshot,
  compareExtraPaymentScenario,
  formatCRC,
  type FinancialInputs,
} from "@/lib/financial-engine";

const baseInputs: FinancialInputs = {
  monthlyIncomeCents: 180000000,
  monthlyExpenseCents: 105000000,
  savingsCents: 32000000,
  assetsCents: 1840000000,
  loanBalanceCents: 620000000,
  annualInterestBps: 750,
  minimumPaymentCents: 16000000,
  extraPaymentCents: 4500000,
  targetAmountCents: 8000000000,
  targetDownPaymentBps: 2000,
};

const navItems = [
  { label: "Inicio", icon: Home },
  { label: "Mi Panorama", icon: Gauge },
  { label: "Mi Norte", icon: Target },
  { label: "Mis Rutas", icon: Route },
  { label: "Decisiones", icon: Compass },
  { label: "Norte360 Advisor", icon: Bot },
  { label: "Mi Familia", icon: Users },
  { label: "Recursos", icon: BookOpen },
];

const routeCards = [
  { title: "Ruta Rapida", copy: "Llegas antes", icon: Sparkles, active: true },
  { title: "Ruta Economica", copy: "Menor costo total", icon: CircleDollarSign },
  { title: "Ruta Balanceada", copy: "Equilibrio ideal", icon: Landmark },
  { title: "Ruta Segura", copy: "Menor riesgo", icon: ShieldCheck },
];

const resourceCards = [
  "Guia para comprar tu primera casa en Costa Rica",
  "Como usar tu aguinaldo estrategicamente",
  "Fondo de emergencia: cuanto y como",
  "Interpreta la tasa de interes en Costa Rica",
  "Libertad financiera: pasos posibles en LATAM",
  "Errores financieros mas comunes",
];

const goalTiles: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Comprar casa", icon: Home },
  { label: "Eliminar deudas", icon: CreditCard },
  { label: "Comprar carro", icon: Car },
  { label: "Fondo de emergencia", icon: PiggyBank },
  { label: "Educacion", icon: BookOpen },
  { label: "Retiro", icon: Landmark },
  { label: "Construir patrimonio", icon: LineChart },
  { label: "Personalizado", icon: Plus },
];

export function NorteApp({ userName = "Fabian" }: { userName?: string }) {
  const [inputs, setInputs] = useState(baseInputs);
  const snapshot = useMemo(() => buildFinancialSnapshot(inputs), [inputs]);
  const scenario = useMemo(() => compareExtraPaymentScenario(inputs), [inputs]);

  function setMillions(key: keyof FinancialInputs, value: string) {
    const numeric = Number(value.replace(/[^0-9]/g, ""));
    setInputs((current) => ({ ...current, [key]: numeric * 100000000 }));
  }

  function setPercent(key: keyof FinancialInputs, value: string) {
    const numeric = Number(value.replace(/[^0-9.]/g, ""));
    setInputs((current) => ({ ...current, [key]: Math.round(numeric * 100) }));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <main>
      <section className="app-shell" id="app">
        <aside className="sidebar" aria-label="Navegacion de aplicacion">
          <div className="side-brand">
            <Mountain size={26} />
            <strong>Norte360</strong>
          </div>
          {navItems.map((item, index) => (
            <a className={index === 0 ? "active" : ""} href={`#${slug(item.label)}`} key={item.label}>
              <item.icon size={17} />
              {item.label}
            </a>
          ))}
          <div className="sidebar-bottom">
            <a href="#configuracion">Configuracion</a>
            <button onClick={logout} type="button">Cerrar sesion</button>
          </div>
        </aside>

        <section className="workspace">
          <header className="workspace-header">
            <div>
              <h2>Hola, {userName}</h2>
              <p>Aqui esta tu panorama financiero.</p>
            </div>
            <div className="header-tools">
              <span>4 de septiembre, 2026</span>
              <Bell size={18} />
              <div className="avatar">F</div>
            </div>
          </header>

          <section className="dashboard-grid" id="mi-panorama">
            <article className="panel score-panel">
              <div className="score-ring" style={{ "--score": `${snapshot.norteScore * 3.6}deg` } as React.CSSProperties}>
                <strong>{snapshot.norteScore}</strong>
                <span>de 100</span>
              </div>
              <div>
                <p className="eyebrow">Norte Score</p>
                <h3>Vas por buen camino</h3>
                <p>
                  Tienes una base solida. Hay oportunidades para mejorar tu
                  ahorro y reducir deuda.
                </p>
                <a className="text-link" href="#rutas">
                  Ver detalles <ArrowRight size={15} />
                </a>
              </div>
            </article>

            <article className="panel image-panel">
              <p>Disciplina hoy, libertad manana.</p>
            </article>

            <Metric title="Ingresos mensuales" value={formatCRC(snapshot.monthlyIncomeCents)} trend="+12%" />
            <Metric title="Gastos mensuales" value={formatCRC(snapshot.monthlyExpenseCents)} trend="-3%" tone="warn" />
            <Metric title="Deuda total" value={formatCRC(snapshot.loanBalanceCents)} trend="-8%" />
            <Metric title="Ahorro mensual" value={formatCRC(snapshot.monthlySurplusCents)} trend="+20%" />
            <Metric title="Patrimonio neto" value={formatCRC(snapshot.netWorthCents)} trend="+15%" />
          </section>

          <section className="two-column" id="mi-norte">
            <article className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Mi Norte</p>
                  <h3>Define tu destino financiero</h3>
                </div>
                <Target size={24} />
              </div>
              <div className="goal-grid">
                {goalTiles.map(({ label, icon: Icon }) => (
                  <button className={label === "Comprar casa" ? "goal active" : "goal"} key={label}>
                    <Icon size={22} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <div className="form-grid">
                <label>
                  Valor de propiedad
                  <input value={inputs.targetAmountCents / 100000000} onChange={(event) => setMillions("targetAmountCents", event.target.value)} />
                  <span>millones CRC</span>
                </label>
                <label>
                  Prima inicial
                  <input value={inputs.targetDownPaymentBps / 100} onChange={(event) => setPercent("targetDownPaymentBps", event.target.value)} />
                  <span>%</span>
                </label>
                <label>
                  Plazo
                  <select defaultValue="20">
                    <option>20</option>
                    <option>25</option>
                    <option>30</option>
                  </select>
                  <span>anos</span>
                </label>
              </div>
            </article>

            <article className="panel photo-note">
              <div>
                <h3>Tu casa, un paso mas cerca.</h3>
                <p>Un mejor futuro se construye con decisiones de hoy.</p>
              </div>
            </article>
          </section>

          <section className="panel route-section" id="mis-rutas">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Mis Rutas</p>
                <h3>Compara caminos para alcanzar tu Norte</h3>
              </div>
              <Route size={24} />
            </div>
            <div className="route-card-grid">
              {routeCards.map((card) => (
                <button className={card.active ? "route-choice active" : "route-choice"} key={card.title}>
                  <card.icon size={24} />
                  <strong>{card.title}</strong>
                  <span>{card.copy}</span>
                </button>
              ))}
            </div>
            <div className="route-result">
              <div>
                <p className="eyebrow">Ruta Rapida</p>
                <h4>
                  Llegada estimada <strong>{scenario.optimized.debtFreeYear}</strong>
                </h4>
                <span className="pill">{scenario.yearsSaved} anos antes</span>
                <div className="route-stats">
                  <span>Pago mensual</span>
                  <strong>{formatCRC(scenario.optimized.monthlyPaymentCents)}</strong>
                  <span>Interes evitado</span>
                  <strong>{formatCRC(scenario.interestSavedCents)}</strong>
                </div>
              </div>
              <div className="chart" aria-label="Comparacion de rutas">
                <span className="line current" />
                <span className="line optimized" />
                <b>Ruta actual<br />{scenario.baseline.debtFreeYear}</b>
                <em>Llegas antes<br />{scenario.optimized.debtFreeYear}</em>
              </div>
            </div>
          </section>

          <section className="two-column" id="decisiones">
            <article className="panel simulator">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Decision Lab</p>
                  <h3>Simulador de compra de casa</h3>
                </div>
                <Compass size={24} />
              </div>
              <div className="tabs">
                {["Casa", "Carro", "Consolidar deuda", "Invertir vs Deuda"].map((tab) => (
                  <button className={tab === "Casa" ? "active" : ""} key={tab}>{tab}</button>
                ))}
              </div>
              <div className="form-grid">
                <label>
                  Precio de propiedad
                  <input value={inputs.targetAmountCents / 100000000} onChange={(event) => setMillions("targetAmountCents", event.target.value)} />
                  <span>millones CRC</span>
                </label>
                <label>
                  Prima inicial
                  <input value={inputs.targetDownPaymentBps / 100} onChange={(event) => setPercent("targetDownPaymentBps", event.target.value)} />
                  <span>%</span>
                </label>
                <label>
                  Tasa de interes
                  <input value={inputs.annualInterestBps / 100} onChange={(event) => setPercent("annualInterestBps", event.target.value)} />
                  <span>% anual</span>
                </label>
              </div>
            </article>

            <article className="panel results-card">
              <p className="eyebrow">Resultados</p>
              <h3>{formatCRC(snapshot.estimatedHomePaymentCents)}</h3>
              <p>Pago mensual estimado para una hipoteca a 20 anos.</p>
              <div className="good-news">
                <BadgeCheck size={22} />
                <div>
                  <strong>Puedes hacerlo</strong>
                  <span>Esta opcion se ajusta a tu situacion actual.</span>
                </div>
              </div>
              <ul className="impact-list">
                <li>Tu fecha de libertad financiera se moveria {scenario.yearsSaved} anos antes.</li>
                <li>Intereses potencialmente evitados: {formatCRC(scenario.interestSavedCents)}.</li>
              </ul>
            </article>
          </section>

          <section className="two-column" id="norte360-advisor">
            <article className="panel advisor">
              <p className="eyebrow">Norte360 Advisor</p>
              <h3>Te explico el camino</h3>
              <div className="chat-bubble user">Me conviene aportar extra a mi deuda?</div>
              <div className="chat-bubble bot">
                Con tus datos actuales, aportar {formatCRC(inputs.extraPaymentCents)} adicionales al mes podria adelantar tu Norte
                y evitar cerca de {formatCRC(scenario.interestSavedCents)} en intereses. Mantendria tu fondo de emergencia primero.
              </div>
            </article>

            <article className="panel family" id="mi-familia">
              <p className="eyebrow">Mi Familia</p>
              <h3>Un mismo Norte, mas posibilidades.</h3>
              <div className="family-row">
                {["Fabian", "Maria Jose", "Daniel"].map((name) => (
                  <span key={name}>{name}</span>
                ))}
                <button aria-label="Agregar familiar"><Plus size={18} /></button>
              </div>
              <Metric title="Panorama familiar" value={formatCRC(340000000)} trend="+ objetivo compartido" />
            </article>
          </section>

          <section className="panel resources" id="recursos">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Recursos</p>
                <h3>Aprende a tu ritmo</h3>
              </div>
              <BookOpen size={24} />
            </div>
            <div className="resource-grid">
              {resourceCards.map((title, index) => (
                <article key={title}>
                  <span>{index % 2 ? "Articulo" : "Video"} · {8 + index} min</span>
                  <h4>{title}</h4>
                </article>
              ))}
            </div>
          </section>

          <section className="roadmap" id="roadmap">
            <p className="eyebrow">Roadmap de producto</p>
            <h2>Una ruta de construccion por fases</h2>
            <div className="roadmap-grid">
              {[
                ["MVP", "Donde estoy: ingresos, gastos, deudas, activos, score y primer Norte."],
                ["Motor de rutas", "Rutas rapida, economica, balanceada y segura con escenarios."],
                ["Decision Lab", "Simuladores de casa, carro, consolidacion, inversion y salario."],
                ["Costa Rica", "Aguinaldo, quincena, marchamo, educacion y supuestos locales."],
                ["Advisor", "Coaching con IA basado en resultados deterministas."],
                ["Familia", "Plan financiero del hogar, permisos y metas compartidas."],
              ].map(([phase, text]) => (
                <article key={phase}>
                  <strong>{phase}</strong>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>
        </section>
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

function Metric({
  title,
  value,
  trend,
  tone,
}: {
  title: string;
  value: string;
  trend: string;
  tone?: "warn";
}) {
  return (
    <article className="metric-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <small className={tone === "warn" ? "warn" : ""}>{trend}</small>
    </article>
  );
}

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
