import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, ChevronDown, Compass, FileDown, Fingerprint, History, Landmark, LockKeyhole, Mountain, Route, ShieldCheck, Target, Users, Wallet } from "lucide-react";
import { ProductExplorer } from "@/components/product-explorer";
import styles from "./marketing.module.css";

export const metadata: Metadata = {
  title: "Norte360 | Tu mapa financiero personal",
  description: "Conoce tus finanzas, organiza tus metas y compara decisiones con Norte360. Panorama, cuentas, rutas, simuladores y planificación familiar en un solo lugar.",
};

const capabilities = [
  { icon: Wallet, title: "Tu dinero, en contexto", tag: "Mi Panorama", copy: "Reúne ingresos, gastos, ahorro, activos y deudas. Entiende tu flujo de caja y cómo se compone tu patrimonio." },
  { icon: Landmark, title: "Cada movimiento cuenta", tag: "Cuentas y movimientos", copy: "Registra cuentas y saldos, organiza transacciones e importa archivos CSV en colones. Consulta tus movimientos del mes." },
  { icon: Target, title: "Metas con un siguiente paso", tag: "Mi Norte", copy: "Define cuánto necesitas, asigna un ahorro mensual y registra aportes para una casa, educación o tu fondo de emergencia." },
  { icon: Route, title: "Más de un camino posible", tag: "Mis Rutas", copy: "Compara estrategias de pago de deudas, plazos e intereses estimados. Guarda escenarios y vuelve a ellos cuando cambie tu situación." },
  { icon: Compass, title: "Decide con perspectiva", tag: "Decision Lab", copy: "Explora vivienda, carro, consolidación, inversión frente a deuda, cambios de ingreso neto y distribución de ingresos extraordinarios." },
  { icon: Users, title: "Un Norte compartido", tag: "Mi Familia", copy: "Invita a personas que ya tengan una cuenta, consulta el panorama del hogar y organiza metas compartidas con permisos." },
  { icon: Fingerprint, title: "Entiende tus resultados", tag: "Norte360 Advisor", copy: "Recibe explicaciones basadas en tu panorama y en los cálculos del producto. Conserva o elimina tu conversación." },
  { icon: BookOpen, title: "Aprende a tu ritmo", tag: "Recursos", copy: "Consulta contenido sobre presupuesto, ahorro y deuda. Marca tus lecturas completadas y retoma donde te quedaste." },
  { icon: History, title: "Tu progreso tiene historia", tag: "Historial y notificaciones", copy: "Revisa escenarios y simulaciones guardadas, consulta avisos y elimina registros que ya no necesites." },
];

const questions = [
  ["¿Qué necesito para empezar?", "Una cuenta y una primera idea de tus ingresos, gastos, activos y deudas. Puedes ingresar la información manualmente y actualizarla cuando cambie tu situación."],
  ["¿Norte360 se conecta automáticamente con mi banco?", "Todavía no. Actualmente puedes registrar cuentas y movimientos manualmente o importar un CSV en colones. Los saldos confirmados se registran por separado: importar transacciones no cambia automáticamente el saldo de una cuenta."],
  ["¿Puedo usarlo con mi familia?", "Sí. Puedes crear un hogar e invitar a personas que ya estén registradas. La invitación debe aceptarse antes de compartir el panorama familiar. Las metas compartidas están sujetas a los permisos de cada miembro."],
  ["¿El Norte Score es una calificación crediticia?", "No. Es un indicador orientativo calculado con tus datos dentro de Norte360. No es una calificación de una entidad financiera ni garantiza aprobación de crédito."],
  ["¿El Advisor utiliza inteligencia artificial?", "La versión actual incluye explicaciones basadas en reglas y cálculos financieros. Las respuestas con IA externa requieren activar el servicio y tu consentimiento antes de compartir la pregunta y el resumen financiero."],
  ["¿Las simulaciones garantizan un resultado?", "No. Son estimaciones basadas en los datos y supuestos que ingresas. La simulación de vivienda no incluye todos los gastos de cierre ni seguros. El cambio salarial usa ingreso neto; la distribución de ingresos extraordinarios no calcula el aguinaldo legal. Norte360 no ejecuta inversiones ni pagos."],
  ["¿Cuánto cuesta Norte360?", "Estamos en una etapa de acceso privado. Los planes y precios comerciales todavía no están definidos. Este sitio no ofrece suscripciones ni procesa pagos."],
  ["¿Puedo exportar o eliminar mi información?", "Desde la configuración de tu cuenta puedes exportar tus datos personales y solicitar la eliminación de la cuenta con tu contraseña. Si administras un hogar con otros miembros, debes resolver esa relación antes de eliminarla."],
];

export default function MarketingPage() {
  return (
    <div className={styles.site}>
      <a className={styles.skip} href="#contenido">Ir al contenido</a>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Navegación principal">
          <Link href="/" className={styles.brand}><Mountain size={31} aria-hidden="true" />Norte360</Link>
          <div className={styles.navlinks}><a href="#producto">Producto</a><a href="#funciones">Funcionalidades</a><a href="#confianza">Tus datos</a><a href="#preguntas">Preguntas</a></div>
          <div className={styles.actions}><Link className={styles.login} href="/login">Iniciar sesión</Link><Link className={styles.primary} href="/create-account">Crear cuenta <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
          <details className={styles.mobileMenu}><summary aria-label="Abrir navegación"><ChevronDown size={22} /></summary><div><a href="#producto">Producto</a><a href="#funciones">Funcionalidades</a><a href="#confianza">Tus datos</a><a href="#preguntas">Preguntas</a><Link href="/login">Iniciar sesión</Link></div></details>
        </nav>
      </header>
      <main id="contenido">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>TU MAPA FINANCIERO PERSONAL</p>
            <h1 id="hero-title">Norte360</h1>
            <p className={styles.heroHeadline}>Decisiones de hoy.<br />Un mejor mañana.</p>
            <p className={styles.heroCopy}>Entiende dónde estás, descubre tus opciones y construye un plan para llegar a donde quieres.</p>
            <div className={styles.heroActions}><Link className={styles.primary} href="/create-account">Crear mi cuenta <ArrowRight size={18} aria-hidden="true" /></Link><a className={styles.heroLink} href="#producto">Conoce Norte360 <ArrowDown size={17} aria-hidden="true" /></a></div>
            <p className={styles.heroNote}>Acceso privado · Finanzas personales y del hogar</p>
          </div>
          <div className={styles.heroCaption}><span>Tu Norte no es un número.</span><strong>Es la vida que quieres construir.</strong></div>
        </section>
        <div className={styles.principles}><div><Compass size={22} /><span>Claridad para empezar</span></div><div><Route size={22} /><span>Opciones para comparar</span></div><div><Target size={22} /><span>Un plan para avanzar</span></div></div>
        <section className={styles.section} id="producto" aria-labelledby="product-title">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>DE TU PANORAMA A TU NORTE</p><h2 id="product-title">Todo empieza por ver<br />el panorama completo.</h2></div><p>No se trata solo de registrar números. Se trata de entender qué significan para tus planes, tus decisiones y tu tranquilidad.</p></div>
          <ProductExplorer />
        </section>
        <section className={styles.processBand} aria-labelledby="steps-title"><div className={styles.section}>
          <p className={styles.eyebrow}>PASO A PASO</p><h2 id="steps-title">De “¿por dónde empiezo?”<br />a “este es mi siguiente paso”.</h2>
          <ol className={styles.steps}><li><span>01</span><h3>Conoce tu punto de partida</h3><p>Registra tu situación actual. Reúne lo que recibes, lo que gastas, lo que tienes y lo que debes.</p></li><li><span>02</span><h3>Dale un nombre a tu meta</h3><p>Una casa, menos deuda o un colchón para imprevistos. Define tu objetivo y una aportación mensual.</p></li><li><span>03</span><h3>Compara antes de decidir</h3><p>Explora escenarios, guarda tus resultados y ajusta el plan a medida que tu vida cambia.</p></li></ol>
        </div></section>
        <section className={styles.section} id="funciones" aria-labelledby="features-title">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>UN SOLO LUGAR. MUCHAS POSIBILIDADES.</p><h2 id="features-title">Herramientas para<br />las decisiones de verdad.</h2></div><p>Conoce las capacidades de nuestra versión en desarrollo privado. Algunas funciones continúan en validación antes del lanzamiento.</p></div>
          <div className={styles.featureGrid}>{capabilities.map(({ icon: Icon, title, tag, copy }) => <article key={tag}><Icon size={27} aria-hidden="true" /><p className={styles.featureTag}>{tag}</p><h3>{title}</h3><p>{copy}</p></article>)}</div>
          <div className={styles.roadmapNote}><span className={styles.badge}>EN EL HORIZONTE</span><p>Conexiones bancarias automáticas, invitaciones por correo y servicios de IA externos. No forman parte de una promesa de disponibilidad actual.</p></div>
        </section>
        <section className={styles.trustBand} id="confianza" aria-labelledby="trust-title"><div className={`${styles.section} ${styles.trustLayout}`}>
          <div><ShieldCheck size={36} aria-hidden="true" /><p className={styles.eyebrow}>TUS FINANZAS SON PERSONALES</p><h2 id="trust-title">Tu información.<br />Tu espacio.</h2><p>El sitio te presenta el producto. Tu panorama y tus registros personales requieren una sesión de cuenta, incluso después de pasar el acceso privado.</p><Link className={styles.textLink} href="/login">Entrar a mi cuenta <ArrowRight size={17} /></Link></div>
          <div className={styles.trustItems}><article><LockKeyhole size={23} /><div><h3>Acceso con tu cuenta</h3><p>Contraseñas protegidas mediante hash y sesiones que puedes cerrar. Las solicitudes de datos revisan la cuenta y sus permisos.</p></div></article><article><Users size={23} /><div><h3>Compartir es una decisión</h3><p>Los miembros deben aceptar la invitación al hogar. La colaboración tiene permisos; no convierte tus registros en información pública.</p></div></article><article><FileDown size={23} /><div><h3>Control sobre tus registros</h3><p>Exporta tus datos, administra tus importaciones y elimina registros desde tu espacio personal.</p></div></article></div>
        </div></section>
        <section className={`${styles.section} ${styles.faqLayout}`} id="preguntas" aria-labelledby="faq-title"><div><p className={styles.eyebrow}>ANTES DE EMPEZAR</p><h2 id="faq-title">Buenas preguntas.<br />Respuestas claras.</h2><p>Conoce lo que Norte360 hace hoy y los límites que importa tener presentes.</p></div><div className={styles.faq}>{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={20} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></section>
        <section className={styles.cta} id="acceso"><div><p className={styles.eyebrow}>TU SIGUIENTE PASO</p><h2>Empieza por entender.<br />Sigue con un plan.</h2><p>Norte360 está en desarrollo privado.<br />Si tienes acceso, crea tu cuenta y construye tu primer panorama.</p><Link className={styles.primary} href="/create-account">Crear mi cuenta <ArrowRight size={18} aria-hidden="true" /></Link><Link className={styles.ctaLogin} href="/login">Ya tengo cuenta</Link></div><Mountain size={160} strokeWidth={.7} aria-hidden="true" /></section>
      </main>
      <footer className={styles.footer}><div className={styles.footerTop}><Link href="/" className={styles.brand}><Mountain size={29} />Norte360</Link><p>Tu Norte. Tus decisiones.</p><nav aria-label="Navegación del pie de página"><a href="#funciones">Funcionalidades</a><a href="#confianza">Tus datos</a><a href="#preguntas">Preguntas</a><Link href="/create-account">Crear cuenta</Link></nav></div><div className={styles.footerBottom}><p>© {new Date().getFullYear()} Norte360 · Desarrollo privado</p><p>Herramienta de planificación y educación financiera. Las proyecciones no son garantías ni sustituyen asesoría profesional.</p></div></footer>
    </div>
  );
}
