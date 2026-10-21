import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronDown,
  CircleDollarSign,
  Compass,
  FileDown,
  Gauge,
  Home,
  Landmark,
  LockKeyhole,
  Mountain,
  PiggyBank,
  Route,
  ShieldCheck,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { ProductExplorer } from "@/components/product-explorer";
import styles from "./marketing.module.css";

export const metadata: Metadata = {
  title: "Norte360 | Planificación financiera personal y familiar",
  description: "Organiza tu panorama financiero, define metas y compara decisiones con estimaciones basadas en tus datos.",
};

const journey = [
  { number: "01", icon: Gauge, title: "Entiende dónde estás", copy: "Reúne ingresos, gastos, cuentas, activos y deudas para leer tu flujo y patrimonio en contexto.", note: "Tu Panorama" },
  { number: "02", icon: Target, title: "Define hacia dónde vas", copy: "Convierte una casa, un fondo de emergencia o una deuda menos en una meta con aportes y progreso.", note: "Mi Norte" },
  { number: "03", icon: Route, title: "Compara cómo llegar", copy: "Contrasta rutas y prueba decisiones antes de comprometer tu dinero. Guarda escenarios y vuelve a ellos.", note: "Rutas y Decision Lab" },
];

const useCases = [
  { icon: Route, eyebrow: "DEUDA", title: "Encuentra una ruta que puedas sostener.", copy: "Compara pagos, plazos e intereses estimados para entender el efecto de diferentes estrategias." },
  { icon: PiggyBank, eyebrow: "RESPALDO", title: "Haz visible el progreso que estás construyendo.", copy: "Define una meta, registra aportes y observa cuánto falta con una asignación mensual constante." },
  { icon: Compass, eyebrow: "DECISIONES", title: "Haz las preguntas antes del compromiso.", copy: "Explora vivienda, carro, consolidación, inversión frente a deuda, salario e ingreso extraordinario." },
];

const questions = [
  ["¿Qué necesito para empezar?", "Una cuenta y una primera idea de tus ingresos, gastos, activos y deudas. Puedes ingresar la información manualmente y actualizarla cuando cambie tu situación."],
  ["¿Norte360 se conecta automáticamente con mi banco?", "Todavía no. Puedes registrar cuentas y movimientos manualmente o importar un CSV en colones. Importar movimientos no cambia automáticamente el saldo confirmado de una cuenta."],
  ["¿Qué significa el Norte Score?", "Es un indicador orientativo calculado con tus datos dentro de Norte360. No es una calificación crediticia ni garantiza aprobación de crédito."],
  ["¿Las simulaciones garantizan resultados?", "No. Son estimaciones basadas en tus datos y supuestos. Norte360 no ejecuta pagos, inversiones ni productos financieros."],
  ["¿Cómo controlo mis datos?", "Desde tu cuenta puedes exportar tus datos, administrar importaciones y solicitar la eliminación de la cuenta. Compartir un hogar requiere aceptación y permisos."],
];

export default function MarketingPage() {
  return (
    <div className={styles.site}>
      <a className={styles.skip} href="#contenido">Ir al contenido</a>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Navegación principal">
          <Link href="/" className={styles.brand}><Mountain size={31} aria-hidden="true" />Norte360</Link>
          <div className={styles.navlinks}><a href="#como-funciona">Cómo funciona</a><a href="#producto">Producto</a><a href="#confianza">Confianza</a><a href="#preguntas">Preguntas</a></div>
          <div className={styles.actions}><Link className={styles.login} href="/login">Iniciar sesión</Link><Link className={styles.primary} href="/create-account">Crear cuenta <ArrowRight size={16} aria-hidden="true" /></Link></div>
          <details className={styles.mobileMenu}><summary aria-label="Abrir navegación"><span>Menú</span><ChevronDown size={20} /></summary><div><a href="#como-funciona">Cómo funciona</a><a href="#producto">Producto</a><a href="#confianza">Confianza</a><a href="#preguntas">Preguntas</a><Link href="/login">Iniciar sesión</Link></div></details>
        </nav>
      </header>

      <main id="contenido">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <p className={styles.eyebrow}>TU MAPA FINANCIERO PERSONAL</p>
              <h1 id="hero-title">Ve tu panorama.<br /><em>Elige tu mejor ruta.</em></h1>
              <p className={styles.heroCopy}>Reúne tus números, convierte tus metas en un plan y compara decisiones con estimaciones basadas en tu realidad.</p>
              <div className={styles.heroActions}><Link className={styles.primary} href="/create-account">Construir mi panorama <ArrowRight size={18} /></Link><a className={styles.heroLink} href="#producto">Ver el producto</a></div>
              <p className={styles.heroNote}>Acceso privado · Cálculos orientativos · Sin conexión bancaria automática</p>
            </div>

            <div className={styles.productStage} aria-label="Ejemplo ilustrativo del panel de Norte360">
              <div className={styles.stageChrome}><span><Mountain size={17} /> Norte360</span><span>Datos ilustrativos</span></div>
              <div className={styles.stageWelcome}><div><small>MARTES, 20 DE OCTUBRE</small><h2>Buenos días, Carolina</h2><p>Este es el próximo paso más útil para tu panorama.</p></div><Compass size={36} /></div>
              <div className={styles.stageGrid}>
                <article className={styles.stageNext}><div><span className={styles.stageKicker}><Target size={18} /> Tu próximo paso</span><h3>Completa tu fondo de emergencia</h3><p>Te faltan ₡420.000 para alcanzar tres meses de respaldo.</p><div className={styles.stageProgress}><i /></div><strong>2.6 de 3 meses</strong></div><div className={styles.miniRing}><b>87%</b><span>de la meta</span></div></article>
                <article className={styles.stageScore}><div className={styles.scoreRing}><b>72</b><span>de 100</span></div><div><span className={styles.stageKicker}><BarChart3 size={18} /> Norte Score</span><strong>Buen avance</strong><p>Flujo, deuda, respaldo y patrimonio en una sola lectura.</p></div></article>
              </div>
              <div className={styles.stageMetrics}><div><Wallet size={18} /><span>Disponible este mes</span><strong>₡590.000</strong></div><div><Landmark size={18} /><span>Patrimonio neto</span><strong>₡18.600.000</strong></div><div><Route size={18} /><span>Ruta activa</span><strong>31 meses</strong></div></div>
            </div>
          </div>
        </section>

        <section className={styles.proofStrip} aria-label="Características principales"><div><CircleDollarSign size={22} /><span>Montos y supuestos definidos por ti</span></div><div><Compass size={22} /><span>Escenarios guardados para comparar</span></div><div><ShieldCheck size={22} /><span>Datos personales dentro de tu sesión</span></div></section>

        <section className={styles.section} id="como-funciona" aria-labelledby="journey-title">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>DE TUS NÚMEROS A UN SIGUIENTE PASO</p><h2 id="journey-title">Una vista clara cambia<br />la forma de decidir.</h2></div><p>Norte360 conecta tu situación actual, lo que quieres alcanzar y las opciones que puedes comparar antes de avanzar.</p></div>
          <ol className={styles.journey}>{journey.map(({ number, icon: Icon, title, copy, note }) => <li key={number}><span className={styles.journeyNumber}>{number}</span><Icon size={28} aria-hidden="true" /><small>{note}</small><h3>{title}</h3><p>{copy}</p></li>)}</ol>
        </section>

        <section className={styles.productBand} id="producto" aria-labelledby="product-title"><div className={styles.section}>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>EXPLORA NORTE360</p><h2 id="product-title">Un producto que convierte<br />información en dirección.</h2></div><p>Recorre las cuatro experiencias centrales con ejemplos ilustrativos y conoce cómo se conectan dentro de tu espacio.</p></div>
          <ProductExplorer />
        </div></section>

        <section className={styles.section} aria-labelledby="decision-title">
          <div className={styles.decisionStory}>
            <div className={styles.decisionCopy}><p className={styles.eyebrow}>UNA DECISIÓN REAL</p><h2 id="decision-title">¿Puedo asumir esta cuota sin perder margen?</h2><p>Decision Lab te permite ajustar supuestos y ver una estimación antes de comprometerte.</p><div className={styles.decisionInputs}><span>Propiedad<strong>₡68.500.000</strong></span><span>Prima<strong>₡12.000.000</strong></span><span>Tasa anual<strong>7.5%</strong></span><span>Plazo<strong>20 años</strong></span></div><p className={styles.disclaimer}>Ejemplo ilustrativo. No incluye seguros, comisiones ni gastos de cierre.</p></div>
            <div className={styles.decisionResult}><span className={styles.stageKicker}><Home size={19} /> Capacidad estimada</span><div className={styles.resultAmount}><small>Cuota mensual estimada</small><strong>₡420.000</strong></div><div className={styles.resultCards}><span><Wallet size={20} />Disponible restante<strong>₡170.000</strong></span><span><Gauge size={20} />Compromiso de ingreso<strong>35%</strong></span></div><div className={styles.resultCallout}><ShieldCheck size={22} /><p>Revisa la prima, tus gastos y las cuotas actuales antes de decidir.</p></div></div>
          </div>
        </section>

        <section className={styles.useCaseBand} aria-labelledby="cases-title"><div className={styles.section}>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>DECISIONES DE LA VIDA REAL</p><h2 id="cases-title">Tres razones para<br />volver a mirar el mapa.</h2></div><p>El producto prioriza claridad, comparación y seguimiento. Las estimaciones cambian cuando cambian tus datos.</p></div>
          <div className={styles.useCases}>{useCases.map(({ icon: Icon, eyebrow, title, copy }) => <article key={eyebrow}><Icon size={30} /><small>{eyebrow}</small><h3>{title}</h3><p>{copy}</p></article>)}</div>
          <div className={styles.secondaryCapabilities}><span><Users size={20} />Planificación familiar</span><span><Compass size={20} />Advisor con reglas claras</span><span><BookOpen size={20} />Recursos y aprendizaje</span><span><FileDown size={20} />Historial y exportación</span></div>
        </div></section>

        <section className={styles.trustBand} id="confianza" aria-labelledby="trust-title"><div className={`${styles.section} ${styles.trustLayout}`}>
          <div className={styles.trustLead}><ShieldCheck size={40} /><p className={styles.eyebrow}>CONTROL Y TRANSPARENCIA</p><h2 id="trust-title">Tus números siguen<br />siendo tuyos.</h2><p>Tu panorama y tus registros requieren una sesión personal. Compartir información del hogar siempre requiere aceptación y permisos.</p><Link className={styles.textLink} href="/login">Entrar a mi cuenta <ArrowRight size={17} /></Link></div>
          <div className={styles.trustItems}><article><LockKeyhole size={23} /><div><h3>Acceso personal</h3><p>Las contraseñas se protegen mediante hash y puedes cerrar tus sesiones desde tu cuenta.</p></div></article><article><Users size={23} /><div><h3>Compartir requiere aceptación</h3><p>Una invitación al hogar debe aceptarse antes de mostrar información compartida.</p></div></article><article><FileDown size={23} /><div><h3>Control de tus registros</h3><p>Exporta información, administra importaciones y solicita la eliminación de tu cuenta.</p></div></article></div>
        </div></section>

        <section className={`${styles.section} ${styles.faqLayout}`} id="preguntas" aria-labelledby="faq-title"><div><p className={styles.eyebrow}>ANTES DE EMPEZAR</p><h2 id="faq-title">Buenas preguntas.<br />Respuestas claras.</h2><p>Conoce lo que Norte360 hace hoy y los límites que importa tener presentes.</p></div><div className={styles.faq}>{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={20} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></section>

        <section className={styles.cta} id="acceso"><div><p className={styles.eyebrow}>TU SIGUIENTE PASO</p><h2>Una vista clara puede ser<br />el inicio de una mejor ruta.</h2><p>Norte360 está en acceso privado. Los planes comerciales todavía no están definidos.</p><Link className={styles.primary} href="/create-account">Crear mi cuenta <ArrowRight size={18} /></Link><Link className={styles.ctaLogin} href="/login">Ya tengo cuenta</Link></div><div className={styles.ctaCompass} aria-hidden="true"><Compass size={92} /></div></section>
      </main>

      <footer className={styles.footer}><div className={styles.footerTop}><Link href="/" className={styles.brand}><Mountain size={29} />Norte360</Link><p>Tu panorama. Tu Norte. Tu ruta.</p><nav aria-label="Navegación del pie de página"><a href="#como-funciona">Cómo funciona</a><a href="#producto">Producto</a><a href="#confianza">Confianza</a><a href="#preguntas">Preguntas</a></nav></div><div className={styles.footerBottom}><p>© {new Date().getFullYear()} Norte360 · Acceso privado</p><p>Herramienta de planificación y educación financiera. Las proyecciones no son garantías ni sustituyen asesoría profesional.</p></div></footer>
    </div>
  );
}
