"use client";
import { requestResponse } from "@/lib/client-api";

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
  Mountain,
  PiggyBank,
  Plus,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { LedgerEditor } from "./ledger-editor";
import { DecisionLab } from "./decision-lab";
import { BankingPanel } from "./banking-panel";
import { AccountSettings } from "./account-settings";
import { GoalPlanner } from "./goal-planner";
import { HistoryPanel } from "./history-panel";
import { LearningPanel } from "./learning-panel";
import {
  buildFinancialSnapshot,
  compareExtraPaymentScenario,
  formatCRC,
  monthlyPayment,
  type FinancialInputs,
  type RouteComparison,
} from "@/lib/financial-engine";
import type {
  AdvisorMessage,
  AppGoal,
  AppNotification,
  EducationalResource,
  FamilySummary,
  FullAppData,
  GoalType,
  RouteScenario,
  SavedSimulation,
} from "@/lib/product-db";
import { resolveAppModule, type AppModuleId } from "@/lib/module-navigation";
import type { DecisionType } from "@/lib/decision-engine";

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

const navItems: Array<{ label: string; icon: LucideIcon; href: AppModuleId }> = [
  { label: "Inicio", icon: Home, href: "inicio" },
  { label: "Mi Panorama", icon: Gauge, href: "mi-panorama" },
  { label: "Mi Norte", icon: Target, href: "mi-norte" },
  { label: "Mis Rutas", icon: Route, href: "mis-rutas" },
  { label: "Decision Lab", icon: Compass, href: "decisiones" },
  { label: "Advisor", icon: Bot, href: "norte360-advisor" },
  { label: "Mi Familia", icon: Users, href: "mi-familia" },
  { label: "Recursos", icon: BookOpen, href: "recursos" },
];

const routeCards: Array<{
  title: string;
  copy: string;
  icon: LucideIcon;
  scenarioType: RouteScenario["scenarioType"];
}> = [
  { title: "Ruta Rapida", copy: "Llegas antes", icon: Sparkles, scenarioType: "fast" },
  { title: "Ruta Economica", copy: "Menor costo total", icon: CircleDollarSign, scenarioType: "economical" },
  { title: "Ruta Balanceada", copy: "Equilibrio ideal", icon: Landmark, scenarioType: "balanced" },
  { title: "Ruta Segura", copy: "Menor riesgo", icon: ShieldCheck, scenarioType: "safe" },
];

const goalTiles: Array<{ label: string; icon: LucideIcon; goalType: GoalType }> = [
  { label: "Comprar casa", icon: Home, goalType: "buy_home" },
  { label: "Eliminar deudas", icon: CreditCard, goalType: "pay_debt" },
  { label: "Comprar carro", icon: Car, goalType: "buy_car" },
  { label: "Fondo de emergencia", icon: PiggyBank, goalType: "emergency_fund" },
  { label: "Educacion", icon: BookOpen, goalType: "education" },
  { label: "Retiro", icon: Landmark, goalType: "retirement" },
  { label: "Construir patrimonio", icon: LineChart, goalType: "build_wealth" },
  { label: "Personalizado", icon: Plus, goalType: "custom" },
];

type LabType = "home_purchase" | DecisionType;
const labOptions: Array<{ type: LabType; label: string; icon: LucideIcon }> = [
  { type: "home_purchase", label: "Comprar casa", icon: Home },
  { type: "car_purchase", label: "Comprar carro", icon: Car },
  { type: "debt_consolidation", label: "Consolidar deuda", icon: CreditCard },
  { type: "invest_vs_debt", label: "Invertir vs. deuda", icon: BarChart3 },
  { type: "salary_change", label: "Cambio salarial", icon: Landmark },
  { type: "aguinaldo", label: "Distribuir aguinaldo", icon: Sparkles },
];

type NorteAppProps = {
  userName?: string;
  initialInputs?: FinancialInputs;
  hasSavedProfile?: boolean;
  updatedAt?: string | null;
  initialAppData?: FullAppData;
};

type SaveState = "idle" | "saving" | "saved" | "error";
type ActionState = "idle" | "loading" | "ok" | "error";

const fallbackRouteComparison: RouteComparison = {
  baseline: {
    months: 0,
    totalInterestCents: 0,
    debtFreeYear: new Date().getFullYear(),
    monthlyPaymentCents: 0,
  },
  optimized: {
    months: 0,
    totalInterestCents: 0,
    debtFreeYear: new Date().getFullYear(),
    monthlyPaymentCents: 0,
  },
  monthsSaved: 0,
  yearsSaved: 0,
  interestSavedCents: 0,
};

export function NorteApp({
  userName = "Fabian",
  initialInputs = baseInputs,
  hasSavedProfile = false,
  updatedAt = null,
  initialAppData,
}: NorteAppProps) {
  const startingFinancialData = initialAppData?.financialData;
  const [inputs, setInputs] = useState(() => startingFinancialData?.inputs ?? initialInputs);
  const [profileSaved, setProfileSaved] = useState(startingFinancialData?.hasSavedProfile ?? hasSavedProfile);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(startingFinancialData?.updatedAt ?? updatedAt);
  const [goals, setGoals] = useState<AppGoal[]>(() => initialAppData?.goals ?? []);
  const [ledger, setLedger] = useState(() => initialAppData?.ledger ?? []);
  const [routeScenarios, setRouteScenarios] = useState<RouteScenario[]>(() => initialAppData?.routeScenarios ?? []);
  const [simulations, setSimulations] = useState<SavedSimulation[]>(() => initialAppData?.simulations ?? []);
  const [family, setFamily] = useState<FamilySummary>(() => initialAppData?.family ?? emptyFamily());
  const [invitations, setInvitations] = useState(() => initialAppData?.invitations ?? []);
  const [inviteEmail, setInviteEmail] = useState("");
  const [resources] = useState<EducationalResource[]>(() => initialAppData?.resources ?? []);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => initialAppData?.notifications ?? []);
  const [advisorMessages, setAdvisorMessages] = useState<AdvisorMessage[]>(() => initialAppData?.advisorMessages ?? []);
  const [selectedGoalType, setSelectedGoalType] = useState<GoalType>(() => goals[0]?.goalType ?? "buy_home");
  const [goalName, setGoalName] = useState(goals[0]?.name ?? "Comprar casa");
  const [goalAmount, setGoalAmount] = useState(goals[0]?.targetAmountCents ?? 0);
  const [goalCurrent, setGoalCurrent] = useState(goals[0]?.currentAmountCents ?? 0);
  const [goalDate, setGoalDate] = useState(goals[0]?.targetDate?.slice(0,10) ?? "");
  const [advisorQuestion, setAdvisorQuestion] = useState("");
  const [advisorAI,setAdvisorAI]=useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteScenario["scenarioType"]>("fast");
  const [termYears, setTermYears] = useState(20);
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [actionMessage, setActionMessage] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [activeModule, setActiveModule] = useState<AppModuleId>("inicio");
  const [labType, setLabType] = useState<LabType>("home_purchase");
  const snapshot = useMemo(() => buildFinancialSnapshot(inputs), [inputs]);
  const scenario = useMemo(() => getRouteComparison(inputs), [inputs]);
  const savedFastScenario = routeScenarios.find((item) => item.scenarioType === selectedRoute);
  const displayedScenario = savedFastScenario?.results ?? scenario;
  const activeGoal = goals.find((goal) => goal.goalType === selectedGoalType);
  const unreadNotifications = notifications.filter((notification) => !notification.readAt).length;
  const isProfileComplete = inputs.monthlyIncomeCents > 0 && inputs.monthlyExpenseCents > 0;
  const userInitial = userName.trim().charAt(0).toUpperCase() || "N";
  const headerDate = lastUpdatedAt ? `Actualizado ${formatDisplayDate(lastUpdatedAt)}` : "Perfil pendiente";
  const homePayment = monthlyPayment(Math.round(inputs.targetAmountCents * (1 - inputs.targetDownPaymentBps / 10000)), inputs.annualInterestBps, termYears * 12);
  const homeAffordable = inputs.targetAmountCents > 0 && inputs.monthlyIncomeCents > 0 && inputs.savingsCents >= inputs.targetAmountCents * inputs.targetDownPaymentBps / 10000 && homePayment + inputs.minimumPaymentCents <= inputs.monthlyIncomeCents * 0.35 && homePayment <= snapshot.monthlySurplusCents - inputs.minimumPaymentCents;
  const greetingDate = new Intl.DateTimeFormat("es-CR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const nextGoal = goals.find((goal) => goal.status === "active" && goal.goalType === "emergency_fund" && goal.currentAmountCents < goal.targetAmountCents)
    ?? goals.find((goal) => goal.status === "active" && goal.currentAmountCents < goal.targetAmountCents);
  const referenceEmergencyTarget = inputs.monthlyExpenseCents * 3;
  const nextGoalTarget = nextGoal?.targetAmountCents || referenceEmergencyTarget;
  const nextGoalCurrent = nextGoal?.currentAmountCents ?? inputs.savingsCents;
  const nextGoalProgress = nextGoalTarget > 0 ? Math.min(100, Math.round((nextGoalCurrent / nextGoalTarget) * 100)) : 0;
  const nextGoalGap = Math.max(0, nextGoalTarget - nextGoalCurrent);
  const activeRouteOverview = routeScenarios.find((route) => route.scenarioType === "balanced") ?? routeScenarios[0];
  const pendingSimulation = [...simulations].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  const recentActivity = [
    ...notifications.map((item) => ({ id: `notification-${item.id}`, title: item.title, date: item.createdAt, icon: Bell })),
    ...routeScenarios.map((item) => ({ id: `route-${item.id}`, title: `Guardaste ${item.name}`, date: item.updatedAt, icon: Route })),
    ...simulations.map((item) => ({ id: `simulation-${item.id}`, title: `Simulaste ${simulationLabel(item.simulationType)}`, date: item.createdAt, icon: Compass })),
    ...goals.map((item) => ({ id: `goal-${item.id}`, title: `Actualizaste ${item.name}`, date: item.updatedAt, icon: Target })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 3);

  useEffect(() => {
    function syncModuleFromLocation(focus: boolean) {
      const requested = resolveAppModule(window.location.hash);
      if (window.location.hash !== `#${requested}`) {
        window.history.replaceState(null, "", `#${requested}`);
      }
      presentModule(requested, focus);
    }

    const restoreModule = () => syncModuleFromLocation(true);
    syncModuleFromLocation(false);
    window.addEventListener("hashchange", restoreModule);
    window.addEventListener("popstate", restoreModule);
    return () => {
      window.removeEventListener("hashchange", restoreModule);
      window.removeEventListener("popstate", restoreModule);
    };
  }, []);

  function navigateTo(module: AppModuleId) {
    if (activeModule !== module || window.location.hash !== `#${module}`) {
      window.history.pushState(null, "", `#${module}`);
    }
    presentModule(module, true);
  }

  function presentModule(module: AppModuleId, focus: boolean) {
    setActiveModule(module);
    if (!focus) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    window.requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>(`[data-module="${module}"] h1, [data-module="${module}"] h2, [data-module="${module}"] h3`);
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
      document.querySelector<HTMLElement>(`.app-nav a[href="#${module}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: reducedMotion ? "auto" : "smooth" });
    });
  }

  function followModuleLink(event: React.MouseEvent<HTMLAnchorElement>, module: AppModuleId) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigateTo(module);
  }

  async function perform(action: () => Promise<void>) {
    try { await action(); } catch (error) {
      setActionState("error");
      const message = error instanceof Error ? error.message : "No se pudo completar la operacion.";
      setActionMessage(message);
    }
  }

  async function removeRecord(kind: string, id: string) {
    if (!window.confirm("Eliminar este registro?")) return;
    const response = await requestResponse(`/api/records/${kind}/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Delete failed");
    await refreshAppData();
    setActionState("ok");
    setActionMessage("Registro eliminado.");
  }

  function setMillions(key: keyof FinancialInputs, value: string) {
    const numeric = Number(value.replace(",", "."));
    if (!Number.isFinite(numeric) || numeric < 0) return;
    setInputs((current) => ({ ...current, [key]: Math.round(numeric * 100000000) }));
    resetSaveMessage();
  }

  function setPercent(key: keyof FinancialInputs, value: string) {
    const numeric = Number(value.replace(/[^0-9.]/g, ""));
    setInputs((current) => ({ ...current, [key]: Math.round(numeric * 100) }));
    resetSaveMessage();
  }

  function updateMillions(key: keyof FinancialInputs, value: string) {
    const numeric = Number(value.replace(",", "."));
    if (!Number.isFinite(numeric) || numeric < 0) return;
    setInputs((current) => ({ ...current, [key]: Math.round(numeric * 100000000) }));
    resetSaveMessage();
  }

  function resetSaveMessage() {
    if (saveState !== "saving") {
      setSaveState("idle");
      setSaveMessage("");
    }
  }

  async function saveFinancialProfile() {
    setSaveState("saving");
    setSaveMessage("Guardando tu panorama...");

    try {
      const response = await requestResponse("/api/financial-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs }),
      });

      const body = (await response.json()) as {
        inputs?: FinancialInputs;
        hasSavedProfile?: boolean;
        updatedAt?: string | null;
        error?: string;
      };

      if (!response.ok || !body.inputs) {
        setSaveState("error");
        setSaveMessage(body.error ?? "No se pudo guardar. Intentalo de nuevo.");
        return;
      }

      setInputs(body.inputs);
      setProfileSaved(Boolean(body.hasSavedProfile));
      setLastUpdatedAt(body.updatedAt ?? null);
      setSaveState("saved");
      setSaveMessage("Listo. Tu panorama esta guardado.");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar el panorama.");
      return;
    }
    try { await refreshAppData(); } catch (error) {
      setActionState("error");
      setActionMessage("Tu panorama se guardo, pero no pudimos actualizar los demas paneles. " + (error instanceof Error ? error.message : "Recarga la pagina."));
    }
  }

  async function refreshAppData() {
    const response = await requestResponse("/api/app-data");
    const data = (await response.json()) as FullAppData;
    setLedger(data.ledger);
    setInputs(current=>({...current,savingsCents:data.financialData.inputs.savingsCents,assetsCents:data.financialData.inputs.assetsCents,loanBalanceCents:data.financialData.inputs.loanBalanceCents,minimumPaymentCents:data.financialData.inputs.minimumPaymentCents,annualInterestBps:data.financialData.inputs.annualInterestBps}));
    setGoals(data.goals);
    setRouteScenarios(data.routeScenarios);
    setSimulations(data.simulations);
    setFamily(data.family);
    setInvitations(data.invitations);
    setNotifications(data.notifications);
    setAdvisorMessages(data.advisorMessages);
  }

  async function saveSelectedGoal() {
    const tile = goalTiles.find((item) => item.goalType === selectedGoalType);
    setActionState("loading");
    setActionMessage("Guardando tu Norte...");

    const response = await requestResponse("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: activeGoal?.id,
        name: goalName || tile?.label || "Mi Norte",
        goalType: selectedGoalType,
        targetAmountCents: goalAmount,
        currentAmountCents: goalCurrent,
        targetDate: goalDate || null,
        priority: 1,
        assumptions: {
          targetDownPaymentBps: inputs.targetDownPaymentBps,
          extraPaymentCents: inputs.extraPaymentCents,
        },
      }),
    });

    await applyFullDataResponse(response, "Tu Norte quedo guardado.");
  }

  async function generateRoutes() {
    setActionState("loading");
    setActionMessage("Calculando y guardando rutas...");

    const response = await requestResponse("/api/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs }),
    });
    const body = (await response.json()) as { routeScenarios?: RouteScenario[]; error?: string };

    if (!response.ok || !body.routeScenarios) {
      setActionState("error");
      setActionMessage(body.error ?? "No se pudieron guardar las rutas.");
      return;
    }

    setRouteScenarios(body.routeScenarios);
    setActionState("ok");
    setActionMessage("Rutas guardadas con resultados reales.");
  }

  async function runHomeSimulation() {
    setActionState("loading");
    setActionMessage("Guardando simulacion...");

    const response = await requestResponse("/api/simulations/home-purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs, termYears }),
    });
    const body = (await response.json()) as { simulations?: SavedSimulation[]; error?: string };

    if (!response.ok || !body.simulations) {
      setActionState("error");
      setActionMessage(body.error ?? "No se pudo guardar la simulacion.");
      return;
    }

    setSimulations(body.simulations);
    setActionState("ok");
    setActionMessage("Simulacion guardada en tu historial.");
  }

  async function createFamilyWorkspace() {
    setActionState("loading");
    setActionMessage("Creando espacio familiar...");

    const response = await requestResponse("/api/family", { method: "POST" });
    const body = (await response.json()) as { family?: FamilySummary; error?: string };

    if (!response.ok || !body.family) {
      setActionState("error");
      setActionMessage(body.error ?? "No se pudo crear el espacio familiar.");
      return;
    }

    setFamily(body.family);
    setActionState("ok");
    setActionMessage("Tu espacio familiar esta listo.");
  }

  async function familyAction(body: Record<string, unknown>) {
    const response = await requestResponse("/api/family", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) { setActionMessage(data.error || "No se pudo guardar."); setActionState("error"); return; }
    await refreshAppData();
    setInviteEmail("");
    setActionState("ok");
    setActionMessage("Hogar actualizado.");
  }

  async function markAllNotificationsRead() {
    const response = await requestResponse("/api/notifications/read", { method: "POST" });
    const body = (await response.json()) as { notifications?: AppNotification[] };
    if (response.ok && body.notifications) {
      setNotifications(body.notifications);
    }
  }

  async function askAdvisor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionState("loading");
    setActionMessage("Guardando conversacion del Advisor...");

    const response = await requestResponse("/api/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: advisorQuestion, mode:advisorAI?"ai":"rules",aiConsent:advisorAI }),
    });
    const body = (await response.json()) as { advisorMessages?: AdvisorMessage[]; error?: string };

    if (!response.ok || !body.advisorMessages) {
      setActionState("error");
      setActionMessage(body.error ?? "El Advisor no pudo responder.");
      return;
    }

    setAdvisorMessages(body.advisorMessages);
    setActionState("ok");
    setActionMessage("Conversacion guardada.");
  }

  async function applyFullDataResponse(response: Response, successMessage: string) {
    const body = (await response.json()) as FullAppData & { error?: string };

    if (!response.ok || !body.financialData) {
      setActionState("error");
      setActionMessage(body.error ?? "No se pudo guardar.");
      return;
    }

    setGoals(body.goals);
    setRouteScenarios(body.routeScenarios);
    setSimulations(body.simulations);
    setFamily(body.family);
    setNotifications(body.notifications);
    setAdvisorMessages(body.advisorMessages);
    setActionState("ok");
    setActionMessage(successMessage);
  }

  async function logout() {
    await requestResponse("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <main>
      <section className="app-shell" id="app">
        <a className="app-skip" href="#module-content">Ir al contenido</a>
        <header className="app-topbar">
          <a className="side-brand" href="#inicio" aria-label="Norte360 Inicio" onClick={(event) => followModuleLink(event, "inicio")}>
            <Mountain size={26} />
            <strong>Norte360</strong>
          </a>
          <nav className="app-nav" aria-label="Navegacion principal">
            {navItems.map((item) => (
              <a aria-current={activeModule === item.href ? "page" : undefined} className={activeModule === item.href ? "active" : ""} href={`#${item.href}`} key={item.label} onClick={(event) => followModuleLink(event, item.href)}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="app-account">
            <a aria-current={activeModule === "notificaciones" ? "page" : undefined} aria-label={`Notificaciones: ${unreadNotifications} sin leer`} className="notification-link" href="#notificaciones" title="Notificaciones" onClick={(event) => followModuleLink(event, "notificaciones")}><Bell size={18} aria-hidden="true" /><span aria-hidden="true">{unreadNotifications}</span></a>
            <a aria-current={activeModule === "configuracion" ? "page" : undefined} className="account-link" href="#configuracion" onClick={(event) => followModuleLink(event, "configuracion")}><span className="avatar">{userInitial}</span><span>{userName}</span></a>
            <button onClick={() => void perform(logout)} type="button">Salir</button>
          </div>
        </header>

        <section className="workspace" id="module-content">
          {actionMessage ? <p role="status" className={`status-pill module-status ${actionState}`}>{actionMessage}</p> : null}
          <section className="app-module" data-module="inicio" hidden={activeModule !== "inicio"}>
          <header className="workspace-header executive-hero" id="inicio">
            <div>
              <p className="home-date">{greetingDate}</p>
              <h1>Buenos días, {userName}</h1>
              <p>{profileSaved ? "Este es el próximo paso más útil para avanzar." : "Completa tus datos para activar tu panorama real."}</p>
            </div>
            <div className="header-tools">
              <span>{headerDate}</span>
              <strong>Un paso claro hoy vale mas que diez planes sin empezar.</strong>
            </div>
          </header>

          <section className="home-overview" aria-label="Resumen de inicio">
            <article className="panel next-step-card">
              <div className="home-card-copy">
                <div className="home-card-kicker"><Target size={22} aria-hidden="true" /><strong>Tu próximo paso</strong><span>Recomendado</span></div>
                <h2>{nextGoal?.name ?? "Completa tu fondo de emergencia"}</h2>
                <p>{profileSaved && nextGoalTarget > 0
                  ? nextGoalGap > 0 ? `Te faltan ${formatCRC(nextGoalGap)} para alcanzar esta meta.` : "Esta meta ya está completa. Elige tu siguiente Norte."
                  : "Guarda tus ingresos y gastos para recibir una recomendación basada en tu panorama."}</p>
                <div className="goal-progress" aria-label={`${nextGoalProgress}% de avance`}><span style={{ width: `${nextGoalProgress}%` }} /></div>
                <strong className="progress-caption">{nextGoalProgress}% completado</strong>
                <div className="home-card-actions">
                  <a className="solid-button" href={profileSaved ? "#mi-norte" : "#mi-panorama"} onClick={(event) => followModuleLink(event, profileSaved ? "mi-norte" : "mi-panorama")}>{profileSaved ? "Continuar con esta meta" : "Construir mi Panorama"}<ArrowRight size={17} /></a>
                  <a className="text-link" href="#mi-norte" onClick={(event) => followModuleLink(event, "mi-norte")}>Ver Mi Norte <ArrowRight size={15} /></a>
                </div>
              </div>
              <div className="progress-ring home-progress-ring" role="img" aria-label={`${nextGoalProgress}% de la meta completado`} style={{ "--progress": `${nextGoalProgress * 3.6}deg` } as CSSProperties}>
                <strong>{nextGoalProgress}%</strong><span>de la meta</span>
              </div>
            </article>

            <article className="panel home-score-card">
              <div className="score-ring" role="img" aria-label={`Norte Score ${profileSaved ? snapshot.norteScore : "sin calcular"} de 100`} style={{ "--score": `${snapshot.norteScore * 3.6}deg` } as CSSProperties}>
                <strong>{profileSaved ? snapshot.norteScore : "--"}</strong><span>de 100</span>
              </div>
              <div className="score-summary">
                <div className="home-card-kicker"><BarChart3 size={22} aria-hidden="true" /><strong>Norte Score</strong></div>
                <span className="health-pill">{profileSaved ? snapshot.norteScore >= 70 ? "Buen avance" : "Hay oportunidades" : "Pendiente"}</span>
                <p>{profileSaved ? "Tu puntuación resume flujo, deuda, respaldo y patrimonio." : "Completa tu Panorama para calcular tu punto de partida."}</p>
                <div className="score-drivers">
                  <span><small>Flujo mensual</small><strong>{formatCRC(snapshot.monthlySurplusCents - inputs.minimumPaymentCents)}</strong></span>
                  <span><small>Deuda</small><strong>{snapshot.debtToIncomeBps / 100}%</strong></span>
                  <span><small>Respaldo</small><strong>{snapshot.emergencyCoverageMonths} meses</strong></span>
                </div>
                <a className="text-link" href="#mi-panorama" onClick={(event) => followModuleLink(event, "mi-panorama")}>Ver cómo se calcula <ArrowRight size={15} /></a>
              </div>
            </article>

            <div className="home-metrics">
              <HomeMetric icon={CircleDollarSign} tone="gold" label="Ingreso mensual" value={profileSaved ? formatCRC(snapshot.monthlyIncomeCents) : "--"} note="Ingresos guardados" />
              <HomeMetric icon={PiggyBank} tone="green" label="Disponible este mes" value={profileSaved ? formatCRC(snapshot.monthlySurplusCents - inputs.minimumPaymentCents) : "--"} note="Después de cuotas" />
              <HomeMetric icon={CreditCard} tone="gold" label="Deuda total" value={profileSaved ? formatCRC(snapshot.loanBalanceCents) : "--"} note="Saldo registrado" />
              <HomeMetric icon={Home} tone="green" label="Patrimonio neto" value={profileSaved ? formatCRC(snapshot.netWorthCents) : "--"} note="Activos menos deudas" />
            </div>

            <article className="panel active-route-card">
              <div className="home-card-kicker"><Route size={22} aria-hidden="true" /><strong>Tu ruta activa</strong><a href="#mis-rutas" onClick={(event) => followModuleLink(event, "mis-rutas")}>Abrir Mis Rutas <ArrowRight size={14} /></a></div>
              <h3>{activeRouteOverview?.name ?? "Elige un camino para avanzar"}</h3>
              {activeRouteOverview ? <>
                <div className="route-timeline" aria-label="Progreso estimado de la ruta"><span className="complete" /><span className="complete" /><span /><span /></div>
                <div className="route-labels"><span>Hoy</span><span>Próximo pago</span><span>50% completado</span><span>Libre de deudas<br />{activeRouteOverview.results.optimized.debtFreeYear}</span></div>
                <div className="route-overview-stats"><span><CircleDollarSign size={22} /> <strong>{formatCRC(activeRouteOverview.results.optimized.monthlyPaymentCents)}</strong><small>al mes</small></span><span><BarChart3 size={22} /><strong>{formatCRC(activeRouteOverview.results.interestSavedCents)}</strong><small>de intereses evitados</small></span></div>
              </> : <div className="empty-home-card"><p>Calcula tus rutas para comparar tiempo, pago e intereses.</p><a className="solid-button" href="#mis-rutas" onClick={(event) => followModuleLink(event, "mis-rutas")}>Calcular mis rutas</a></div>}
            </article>

            <article className="panel pending-decision-card">
              <div className="home-card-kicker"><Sparkles size={22} aria-hidden="true" /><strong>Decisión pendiente</strong></div>
              <div className="technical-mark" aria-hidden="true">{pendingSimulation?.simulationType === "car_purchase" ? <Car size={74} /> : <Compass size={74} />}</div>
              <h3>{pendingSimulation ? simulationLabel(pendingSimulation.simulationType) : "Explora una decisión"}</h3>
              <p>{pendingSimulation ? "Tu escenario guardado está listo para continuar." : "Compara una decisión antes de comprometer tu dinero."}</p>
              <a className="solid-button" href="#decisiones" onClick={(event) => followModuleLink(event, "decisiones")}>{pendingSimulation ? "Retomar simulación" : "Abrir Decision Lab"}<ArrowRight size={17} /></a>
            </article>

            <article className="panel recent-activity-card">
              <div className="home-card-kicker"><BookOpen size={22} aria-hidden="true" /><strong>Actividad reciente</strong></div>
              {recentActivity.length ? <ol>{recentActivity.map((item) => <li key={item.id}><span><item.icon size={17} aria-hidden="true" /></span><div><strong>{item.title}</strong><small>{formatRelativeDate(item.date)}</small></div></li>)}</ol> : <div className="empty-home-card"><p>Aún no hay actividad guardada.</p></div>}
              <a className="text-link" href="#historial" onClick={(event) => followModuleLink(event, "historial")}>Ver historial <ArrowRight size={15} /></a>
            </article>
          </section>
          </section>

          <section className="app-module" data-module="mi-panorama" hidden={activeModule !== "mi-panorama"}>
          <ModuleHero eyebrow="Tu punto de partida" title="Mi Panorama" copy="Ordena tus números, entiende tu posición y construye una base clara para decidir." icon={Gauge} />
          <section className="panel data-entry-panel executive-section" id="mi-panorama">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{profileSaved ? "Panorama guardado" : "Primer paso"}</p>
                <h3>{profileSaved ? "Actualiza tus numeros clave" : "Construye tu Panorama"}</h3>
              </div>
              <Gauge size={24} />
            </div>
            <div className="form-grid profile-grid">
              <MoneyField label="Ingresos mensuales" value={inputs.monthlyIncomeCents} onChange={(value) => updateMillions("monthlyIncomeCents", value)} />
              <MoneyField label="Gastos mensuales sin cuotas de deuda" value={inputs.monthlyExpenseCents} onChange={(value) => updateMillions("monthlyExpenseCents", value)} />
              <MoneyField label="Aporte extra mensual" value={inputs.extraPaymentCents} onChange={(value) => updateMillions("extraPaymentCents", value)} />
              <MoneyField label="Meta para casa" value={inputs.targetAmountCents} onChange={(value) => updateMillions("targetAmountCents", value)} />
            </div>
            <div className="save-row">
              <button className="solid-button" disabled={saveState === "saving"} onClick={() => void perform(saveFinancialProfile)} type="button">
                {saveState === "saving" ? "Guardando" : "Guardar panorama"}
                <ArrowRight size={17} />
              </button>
              <span role="status" className={`status-pill ${saveState}`}>
                {saveMessage || (isProfileComplete ? "Datos listos para calcular" : "Agrega ingresos y gastos para empezar")}
              </span>
            </div>
          </section>

          <LedgerEditor items={ledger} onChange={async () => {
            const response = await requestResponse("/api/app-data");
            if (!response.ok) throw new Error("No se pudo actualizar el Panorama.");
            const data = await response.json() as FullAppData;
            setLedger(data.ledger);
            setInputs(current => ({ ...current, savingsCents: data.financialData.inputs.savingsCents, assetsCents: data.financialData.inputs.assetsCents, loanBalanceCents: data.financialData.inputs.loanBalanceCents, minimumPaymentCents: data.financialData.inputs.minimumPaymentCents, annualInterestBps: data.financialData.inputs.annualInterestBps }));
            setFamily(data.family);
          }} />
          <BankingPanel onChange={refreshAppData} />
          <section className="dashboard-grid">
            <article className="panel score-panel">
              <div className="score-ring" style={{ "--score": `${snapshot.norteScore * 3.6}deg` } as CSSProperties}>
                <strong>{profileSaved ? snapshot.norteScore : "--"}</strong>
                <span>de 100</span>
              </div>
              <div>
                <p className="eyebrow">Norte Score</p>
                <h3>{!profileSaved ? "Completa tu Panorama" : snapshot.monthlySurplusCents <= 0 ? "Revisa tu flujo mensual" : "Tu Panorama actual"}</h3>
                <p>
                  Cobertura de emergencia: {snapshot.emergencyCoverageMonths} meses. Cuotas de deuda: {snapshot.debtToIncomeBps / 100}% de tus ingresos.
                </p>
                <a className="text-link" href="#mis-rutas" onClick={(event) => followModuleLink(event, "mis-rutas")}>
                  Ver detalles <ArrowRight size={15} />
                </a>
              </div>
            </article>

            <article className="panel image-panel">
              <p>Disciplina hoy, libertad manana.</p>
            </article>

            <Metric title="Ingresos mensuales" value={formatCRC(snapshot.monthlyIncomeCents)} trend="" />
            <Metric title="Gastos sin cuotas de deuda" value={formatCRC(snapshot.monthlyExpenseCents)} trend="" />
            <Metric title="Deuda total" value={formatCRC(snapshot.loanBalanceCents)} trend="" />
            <Metric title="Disponible despues de cuotas" value={formatCRC(snapshot.monthlySurplusCents - inputs.minimumPaymentCents)} trend="" />
            <Metric title="Patrimonio neto" value={formatCRC(snapshot.netWorthCents)} trend="" />
          </section>
          </section>

          <section className="app-module" data-module="mi-norte" hidden={activeModule !== "mi-norte"}>
          <ModuleHero eyebrow="Objetivos con dirección" title="Mi Norte" copy="Convierte lo que quieres lograr en metas concretas, medibles y compartidas." icon={Target} />
          <GoalPlanner householdId={family.householdId} onChange={refreshAppData} />
          </section>

          <section className="app-module" data-module="mis-rutas" hidden={activeModule !== "mis-rutas"}>
          <ModuleHero eyebrow="Caminos para avanzar" title="Mis Rutas" copy="Compara estrategias y elige la que mejor se adapta a tu vida." icon={Route} />
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
                <button aria-pressed={selectedRoute === card.scenarioType} type="button" onClick={() => setSelectedRoute(card.scenarioType)} className={selectedRoute === card.scenarioType ? "route-choice active" : "route-choice"} key={card.title}>
                  <card.icon size={24} />
                  <strong>{card.title}</strong>
                  <span>{card.copy}</span>
                </button>
              ))}
            </div>
            <div className="route-command-bar">
              <div><strong>{routeCards.find((card) => card.scenarioType === selectedRoute)?.title}</strong>{savedFastScenario ? <span>Guardada {formatDisplayDate(savedFastScenario.updatedAt)}</span> : <span>Vista previa basada en tu Panorama</span>}</div>
              <button className="solid-button" disabled={actionState === "loading"} onClick={() => void perform(generateRoutes)}>Calcular y guardar rutas</button>
            </div>
            <div className="route-result">
              <div>
                <p className="eyebrow">{savedFastScenario?.name ?? "Vista previa de deuda"}</p>
                <h4>
                  Meses para cancelar <strong>{displayedScenario.optimized.months || "Sin estimacion"}</strong>
                </h4>
                <span className="pill">{displayedScenario.monthsSaved} meses antes</span>
                <div className="route-stats">
                  <span>Pago mensual</span>
                  <strong>{formatCRC(displayedScenario.optimized.monthlyPaymentCents)}</strong>
                  <span>Interes evitado</span>
                  <strong>{formatCRC(displayedScenario.interestSavedCents)}</strong>
                </div>
              </div>
              <div>
                <p>Actual: {displayedScenario.baseline.months} meses</p>
                <meter min={0} max={Math.max(displayedScenario.baseline.months, 1)} value={displayedScenario.optimized.months} aria-label="Meses de la ruta seleccionada" />
                {savedFastScenario ? <button aria-label="Eliminar ruta" title="Eliminar ruta" onClick={() => void perform(() => removeRecord("scenarios", savedFastScenario.id))}><Trash2 size={16} aria-hidden="true" /></button> : null}
              </div>
            </div>
          </section>
          </section>

          <section className="app-module" data-module="decisiones" hidden={activeModule !== "decisiones"}>
          <ModuleHero eyebrow="Decide con perspectiva" title="Decision Lab" copy="Prueba escenarios antes de comprometer tu dinero y guarda los que quieras comparar." icon={Compass} />
          <nav className="lab-submenu" aria-label="Simuladores de Decision Lab">
            {labOptions.map((option) => <button aria-pressed={labType === option.type} className={labType === option.type ? "active" : ""} key={option.type} onClick={() => setLabType(option.type)} type="button"><option.icon size={26} aria-hidden="true" /><span>{option.label}</span></button>)}
          </nav>
          {labType === "home_purchase" ? <>
          <section className="two-column" id="decisiones">
            <article className="panel simulator">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Decision Lab</p>
                  <h3>Simulador de compra de casa</h3>
                </div>
                <Compass size={24} />
              </div>
              <div className="form-grid">
                <label>
                  Precio de propiedad
                  <input inputMode="numeric" value={inputs.targetAmountCents / 100000000} onChange={(event) => setMillions("targetAmountCents", event.target.value)} />
                  <span>millones CRC</span>
                </label>
                <label>
                  Prima inicial
                  <input inputMode="decimal" value={inputs.targetDownPaymentBps / 100} onChange={(event) => setPercent("targetDownPaymentBps", event.target.value)} />
                  <span>%</span>
                </label>
                <label>
                  Tasa de interes
                  <input inputMode="decimal" value={inputs.annualInterestBps / 100} onChange={(event) => setPercent("annualInterestBps", event.target.value)} />
                  <span>% anual</span>
                </label>
              </div>
              <label>Plazo en anos<select value={termYears} onChange={event => setTermYears(Number(event.target.value))}>{[5,10,15,20,25,30].map(year => <option key={year} value={year}>{year}</option>)}</select></label>
              <button className="solid-button" disabled={actionState === "loading"} onClick={() => void perform(runHomeSimulation)}>Simular y guardar</button>
              <ul className="saved-records">{simulations.filter(item => item.simulationType === "home_purchase").map(simulation => <li key={simulation.id}><button onClick={() => {
                setInputs(current => ({ ...current, ...simulation.inputs } as FinancialInputs));
                setTermYears(Number(simulation.inputs.termYears) || 20);
              }}>{formatDisplayDate(simulation.createdAt)}: {formatCRC(Number(simulation.results.paymentCents) || 0)}/mes</button><button aria-label="Eliminar simulación" title="Eliminar simulación" onClick={() => void perform(() => removeRecord("simulations", simulation.id))}><Trash2 size={16} aria-hidden="true" /></button></li>)}</ul>
            </article>

            <article className="panel results-card">
              <p className="eyebrow">Resultados</p>
              <h3>{formatCRC(homePayment)}</h3>
              <p>Cuota estimada a {termYears} anos, sin seguros, comisiones ni gastos de cierre.</p>
              <div className="good-news">
                <BadgeCheck size={22} />
                <div>
                  <strong>{homeAffordable ? "Dentro del presupuesto estimado" : "Revisa tu presupuesto"}</strong>
                  <span>{homeAffordable ? "Tienes la prima y flujo para la cuota estimada." : "Revisa la prima disponible, tus gastos y las cuotas actuales."}</span>
                </div>
              </div>
            </article>
          </section>
          </> : <DecisionLab simulations={simulations} onChange={refreshAppData} type={labType} onTypeChange={setLabType} />}
          </section>

          <section className="app-module" data-module="norte360-advisor" hidden={activeModule !== "norte360-advisor"}>
          <ModuleHero eyebrow="Orientación para avanzar" title="Norte360 Advisor" copy="Recibe una lectura clara de tu panorama y próximos pasos basados en tus cifras." icon={Bot} />
          <section className="two-column single-module-column" id="norte360-advisor">
            <article className="panel advisor">
              <p className="eyebrow">Norte360 Advisor</p>
              <h3>Analisis de tu Panorama</h3>
              <p>Orientacion automatica basada en tus cifras guardadas.</p>
              <label className="check-line"><input type="checkbox" checked={advisorAI} onChange={event=>setAdvisorAI(event.target.checked)}/>Consultar con IA: autorizo compartir mi pregunta y resumen financiero con OpenAI.</label>
              {advisorMessages.map(message => <div key={message.id} className={`chat-bubble ${message.role === "user" ? "user" : "bot"}`}>{message.content}</div>)}
              <form onSubmit={event => { event.preventDefault(); void perform(() => askAdvisor(event)); }} className="advisor-form">
                <input aria-label="Pregunta al Advisor" value={advisorQuestion} maxLength={500} minLength={3} required onChange={event => setAdvisorQuestion(event.target.value)} />
                <button className="solid-button" disabled={actionState === "loading"}>Consultar</button>
              </form>
              {advisorMessages.length > 0 ? <button aria-label="Eliminar conversación" title="Eliminar conversación" onClick={() => void perform(async () => {
                if (!window.confirm("Eliminar la conversacion?")) return;
                const response = await requestResponse("/api/advisor", { method: "DELETE" });
                if (!response.ok) throw new Error("Delete failed");
                setAdvisorMessages([]);
              })}><Trash2 size={16} aria-hidden="true" /></button> : null}
            </article>
          </section>
          </section>

          <section className="app-module" data-module="mi-familia" hidden={activeModule !== "mi-familia"}>
          <ModuleHero eyebrow="Un Norte compartido" title="Mi Familia" copy="Coordina metas, permisos y decisiones del hogar desde un mismo lugar." icon={Users} />
          <section className="two-column single-module-column">
            <article className="panel family" id="mi-familia">
              <p className="eyebrow">Mi Familia</p>
              <h3>Un mismo Norte, mas posibilidades.</h3>
              <div className="family-row">
                {family.members.map(member => (
                  <span key={member.id}>{member.name} ({member.acceptedAt ? member.role : "Invitación pendiente"}){member.role !== "owner" ? <button aria-label={`Retirar a ${member.name}`} title="Retirar miembro" onClick={() => void perform(() => familyAction({ operation: "remove", id: member.id }))}><Trash2 size={14} aria-hidden="true" /></button> : null}</span>
                ))}
              </div>
              {family.householdId ? <>
                {family.canManage ? <form onSubmit={event => { event.preventDefault(); void perform(() => familyAction({ operation: "invite", email: inviteEmail })); }}>
                  <label>Email de una cuenta registrada<input type="email" required value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} /></label>
                  <button className="solid-button">Invitar al hogar</button>
                </form> : null}
                <label>Nombre del hogar<input disabled={!family.canManage} value={family.name} onChange={event => setFamily(current => ({ ...current, name: event.target.value }))} /></label>
                <button disabled={!family.canManage} className="solid-button" onClick={() => void perform(async () => {
                  const response = await requestResponse("/api/family", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: family.name }) });
                  if (!response.ok) throw new Error("Save failed");
                  await refreshAppData();
                })}>Guardar nombre</button>
                <p>Patrimonio del hogar: {formatCRC(family.netWorthCents)}</p>
                <button aria-label="Archivar hogar" disabled={!family.canManage} title="Archivar hogar" onClick={() => void perform(async () => {
                  if (!window.confirm("Archivar este hogar?")) return;
                  const response = await requestResponse("/api/family", { method: "DELETE" });
                  if (!response.ok) throw new Error("Delete failed");
                  await refreshAppData();
                })}><Trash2 size={16} aria-hidden="true" /></button>
              </> : <button className="solid-button" onClick={() => void perform(createFamilyWorkspace)}>Crear mi hogar</button>}
              {invitations.map(invitation => <div key={invitation.id}><p>Invitacion: {invitation.name}. Al aceptar compartes tus totales financieros con este hogar.</p><button onClick={() => void perform(() => familyAction({ operation: "accept", id: invitation.id }))}>Aceptar</button><button onClick={() => void perform(() => familyAction({ operation: "remove", id: invitation.id }))}>Rechazar</button></div>)}
            </article>
          </section>
          </section>

          <section className="app-module" data-module="recursos" hidden={activeModule !== "recursos"}>
          <ModuleHero eyebrow="Aprender para decidir" title="Recursos" copy="Fortalece tu criterio financiero con contenido útil para cada etapa de tu camino." icon={BookOpen} />
          <LearningPanel />
          </section>

          <section className="app-module" data-module="notificaciones" hidden={activeModule !== "notificaciones"}>
          <ModuleHero eyebrow="Lo que requiere tu atención" title="Notificaciones" copy="Revisa novedades y cambios recientes de tu panorama." icon={Bell} compact />
          <section className="panel" id="notificaciones">
            <h3>Notificaciones</h3>
            <button onClick={() => void perform(markAllNotificationsRead)}>Marcar todas como leidas</button>
            <ul className="saved-records">{notifications.map(item => <li key={item.id}><div><strong>{item.title}{item.readAt ? "" : " (Nueva)"}</strong><p>{item.body}</p></div><button aria-label={`Eliminar notificación: ${item.title}`} title="Eliminar notificación" onClick={() => void perform(() => removeRecord("notifications", item.id))}><Trash2 size={16} aria-hidden="true" /></button></li>)}</ul>
          </section>
          </section>
          <section className="app-module" data-module="historial" hidden={activeModule !== "historial"}>
          <ModuleHero eyebrow="Tu actividad" title="Historial" copy="Consulta las decisiones, rutas y simulaciones que has guardado." icon={BookOpen} compact />
          <HistoryPanel onChange={refreshAppData} />
          </section>
          <section className="app-module" data-module="configuracion" hidden={activeModule !== "configuracion"}>
          <ModuleHero eyebrow="Seguridad y datos" title="Mi cuenta" copy="Administra tu acceso, verificación y exportación de información." icon={ShieldCheck} compact />
          <AccountSettings />
          </section>
          <section className="roadmap" id="roadmap" hidden>
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

function emptyFamily(): FamilySummary {
  return { canManage: false, householdId: null, name: "Mi Familia", members: [], monthlyIncomeCents: 0, monthlyExpenseCents: 0, netWorthCents: 0 };
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(String(value / 100000000));
  useEffect(() => { setDraft(String(value / 100000000)); }, [value]);
  return (
    <label>
      {label}
      <input inputMode="decimal" value={draft} onChange={event => setDraft(event.target.value)} onBlur={() => onChange(draft)} />
      <span>millones CRC</span>
    </label>
  );
}

function getRouteComparison(inputs: FinancialInputs) {
  try {
    return compareExtraPaymentScenario(inputs);
  } catch {
    return {
      ...fallbackRouteComparison,
      baseline: { ...fallbackRouteComparison.baseline, monthlyPaymentCents: inputs.minimumPaymentCents },
      optimized: {
        ...fallbackRouteComparison.optimized,
        monthlyPaymentCents: inputs.minimumPaymentCents + inputs.extraPaymentCents,
      },
    };
  }
}

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function Feature({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="feature">
      <Icon size={28} />
      <span>{label}</span>
    </div>
  );
}

function ModuleHero({
  eyebrow,
  title,
  copy,
  icon: Icon,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  icon: LucideIcon;
  compact?: boolean;
}) {
  return (
    <header className={`module-hero${compact ? " compact" : ""}`}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      <div className="module-hero-art" aria-hidden="true">
        <span><Icon size={44} /></span>
      </div>
    </header>
  );
}

function HomeMetric({
  icon: Icon,
  tone,
  label,
  value,
  note,
}: {
  icon: LucideIcon;
  tone: "green" | "gold";
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="panel home-metric-card">
      <span className={`home-metric-icon ${tone}`}><Icon size={27} aria-hidden="true" /></span>
      <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
    </article>
  );
}

function simulationLabel(type: SavedSimulation["simulationType"]) {
  return ({
    home_purchase: "Comprar casa",
    car_purchase: "Comprar carro",
    refinance: "Refinanciar una deuda",
    debt_consolidation: "Consolidar deuda",
    invest_vs_debt: "Invertir o pagar deuda",
    salary_change: "Evaluar un cambio salarial",
    aguinaldo: "Distribuir el aguinaldo",
    custom: "Revisar una decisión",
  })[type];
}

function formatRelativeDate(value: string) {
  const difference = Date.now() - Date.parse(value);
  const days = Math.max(0, Math.floor(difference / 86_400_000));
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  return formatDisplayDate(value);
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
