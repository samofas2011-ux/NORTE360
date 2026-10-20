"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Check, Compass, Mountain, Route, Target, Wallet } from "lucide-react";
import Link from "next/link";
import styles from "../../app/marketing.module.css";

const views = [
  { id: "panorama", icon: Wallet, label: "Mi Panorama", title: "Menos números sueltos. Más claridad.", copy: "Observa tus ingresos, gastos y ahorro disponible en un mismo lugar. Tu situación actual es el punto de partida, no el destino.", bullets: ["Ingresos y gastos mensuales", "Activos, deudas y patrimonio", "Indicadores para entender tu situación"] },
  { id: "metas", icon: Target, label: "Mi Norte", title: "Convierte un deseo en un plan.", copy: "Dale una cantidad y una aportación mensual a lo que quieres lograr. Registra tus avances y mantén tu objetivo a la vista.", bullets: ["Varias metas personales o compartidas", "Aportes y progreso registrado", "Tiempo estimado según tu ahorro"] },
  { id: "rutas", icon: Route, label: "Mis Rutas", title: "Una decisión. Diferentes caminos.", copy: "Compara estrategias para pagar tus deudas. Explora qué cambia al priorizar el interés más alto o empezar por el saldo más pequeño.", bullets: ["Estrategias de pago de deudas", "Estimaciones de plazo e intereses", "Escenarios guardados para comparar"] },
  { id: "decisiones", icon: Compass, label: "Decision Lab", title: "Haz las preguntas antes del compromiso.", copy: "Explora el impacto de una compra o un cambio de ingresos con supuestos que tú defines. Guarda el resultado para volver a revisarlo.", bullets: ["Vivienda, carro y consolidación", "Inversión frente a deuda", "Ingreso neto e ingresos extraordinarios"] },
];

export function ProductExplorer() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const view = views[active];
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % views.length;
    else if (event.key === "ArrowLeft") next = (index + views.length - 1) % views.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = views.length - 1;
    else return;
    event.preventDefault(); setActive(next); tabs.current[next]?.focus();
  }
  return <div className={styles.explorer}>
    <div className={styles.tabs} role="tablist" aria-label="Explorar el producto">{views.map(({ id, icon: Icon, label }, index) => <button key={id} id={`tab-${id}`} role="tab" type="button" ref={node => { tabs.current[index] = node; }} aria-selected={active === index} aria-controls="product-panel" tabIndex={active === index ? 0 : -1} onKeyDown={event => navigate(event, index)} onClick={() => setActive(index)}><Icon size={18} aria-hidden="true" />{label}</button>)}</div>
    <div role="tabpanel" id="product-panel" aria-labelledby={`tab-${view.id}`} tabIndex={0} className={styles.explorerPanel}>
      <div className={styles.explorerCopy}><p className={styles.eyebrow}>{view.label}</p><h3>{view.title}</h3><p>{view.copy}</p><ul>{view.bullets.map(item => <li key={item}><Check size={17} aria-hidden="true" />{item}</li>)}</ul><Link className={styles.textLink} href="/create-account">Crear mi cuenta <ArrowRight size={17} /></Link></div>
      <div className={styles.preview} aria-label={`Ejemplo ilustrativo de ${view.label}`}><div className={styles.previewBar}><span><Mountain size={19} />Norte360</span><span>Datos ilustrativos</span></div><div className={styles.previewBody}>
        {view.id === "panorama" && <><div className={styles.previewTitle}><div><small>MI PANORAMA</small><h4>Tu mes, en perspectiva.</h4></div><Wallet size={23} /></div><div className={styles.sampleMetrics}><div><span>Ingresos</span><strong>₡1.800.000</strong></div><div><span>Gastos</span><strong>₡1.050.000</strong></div><div><span>Disponible antes de deudas</span><strong>₡750.000</strong></div></div><div className={styles.sampleChart}><div><span>Gastos</span><i style={{ width: "58.33%" }} /><b>58%</b></div><div><span>Disponible</span><i style={{ width: "41.67%" }} /><b>42%</b></div></div><p className={styles.sampleFoot}>Una lectura de tus ingresos y gastos registrados.</p></>}
        {view.id === "metas" && <><div className={styles.previewTitle}><div><small>MI NORTE</small><h4>Un respaldo para mañana.</h4></div><Target size={23} /></div><div className={styles.sampleGoal}><span>Fondo de emergencia</span><strong>₡900.000 <small>de ₡3.000.000</small></strong><meter aria-label="Progreso ilustrativo de la meta" min={0} max={100} value={30}>30%</meter><div><span>30% de tu meta</span><span>₡100.000 / mes</span></div></div><div className={styles.sampleResult}><span>Tiempo estimado restante</span><strong>21 meses</strong></div><p className={styles.sampleFoot}>Ejemplo con aportes constantes, sin rendimientos.</p></>}
        {view.id === "rutas" && <><div className={styles.previewTitle}><div><small>MIS RUTAS</small><h4>Elige qué priorizar.</h4></div><Route size={23} /></div><div className={styles.sampleRoute}><span>01</span><div><strong>Mayor tasa primero</strong><p>Prioriza la deuda con más interés.</p></div><b>Avalancha</b></div><div className={styles.sampleRoute}><span>02</span><div><strong>Menor saldo primero</strong><p>Empieza por la deuda más pequeña.</p></div><b>Bola de nieve</b></div><p className={styles.sampleFoot}>Los plazos dependen de tus saldos, tasas y pagos.</p></>}
        {view.id === "decisiones" && <><div className={styles.previewTitle}><div><small>DECISION LAB</small><h4>¿Y si cambia mi ingreso?</h4></div><Compass size={23} /></div><div className={styles.sampleComparison}><div><span>Ingreso neto actual</span><strong>₡1.200.000</strong></div><ArrowRight size={22} /><div><span>Nuevo ingreso neto</span><strong>₡1.400.000</strong></div></div><div className={styles.sampleResult}><span>Diferencia mensual</span><strong>+₡200.000</strong></div><p className={styles.sampleFoot}>Ejemplo con gastos sin cambios. No calcula impuestos.</p></>}
      </div></div>
    </div>
  </div>;
}
