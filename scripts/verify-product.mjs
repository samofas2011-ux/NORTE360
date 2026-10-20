import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { neon } from "@neondatabase/serverless";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const base = process.env.TEST_API_URL || "http://localhost:3012";
if (!new URL(base).hostname.match(/^(localhost|127\.0\.0\.1)$/)) throw new Error("Integration tests require a local app server.");
const sql = neon(process.env.DATABASE_URL);
const expires = String(Math.floor(Date.now() / 1000) + 3600);
const token = expires + "." + createHmac("sha256", process.env.SITE_GATE_SECRET).update(expires).digest("hex");
const gate = "norte360_gate=" + token;
const users = [];
let checks = 0;
async function call(path, cookie = "", method = "GET", body, expected = 200, origin = base) {
  const response = await fetch(base + path, { method, redirect: "manual", headers: { cookie, origin, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  assert.equal(response.status, expected, path + " " + method + ": " + await response.clone().text().then(t => t.slice(0,200)));
  checks++;
  return response;
}
async function data(path, cookie, method = "GET", body) { return (await call(path, cookie, method, body)).json(); }
try {
  for (const path of ["/", "/app", "/app/test.json", "/login", "/create-account"]) {
    const response = await call(path, "", "GET", undefined, 307);
    assert.match(response.headers.get("location"), /coming-soon/);
  }
  await call("/api/app-data", "", "GET", undefined, 401);
  await call("/api/app-data", gate, "GET", undefined, 401);
  await call("/api/app-data", "norte360_gate=invalid", "GET", undefined, 401);
  for (let i = 0; i < 2; i++) {
    const email = "norte-test-" + randomUUID() + "@example.invalid";
    users.push({ email });
    const response = await call("/api/auth/register", gate, "POST", { name: "Integration Test", email, password: "Temporary-test-password-2026!" }, 201);
    users[i].id = (await response.json()).user.id;
    users[i].cookie = gate + "; " + response.headers.getSetCookie().find(c => c.startsWith("norte360_session=")).split(";")[0];
  }
  const [a,b] = users;
  const inputs = { monthlyIncomeCents: 180000000, monthlyExpenseCents: 105000000, savingsCents: 0, assetsCents: 0, loanBalanceCents: 0, annualInterestBps: 750, minimumPaymentCents: 0, extraPaymentCents: 4500000, targetAmountCents: 8000000000, targetDownPaymentBps: 0 };
  await call("/api/financial-profile", a.cookie, "PUT", { inputs }, 403, "https://other.example");
  await call("/api/financial-profile", a.cookie, "PUT", { inputs: { ...inputs, monthlyIncomeCents: -1 } }, 400);
  await data("/api/financial-profile", a.cookie, "PUT", { inputs });
  assert.equal((await data("/api/financial-profile", a.cookie)).inputs.targetDownPaymentBps, 0);
  const cash = { kind: "assets", name: "Test savings", category: "cash", amountCents: 32000000 };
  let ledger = await data("/api/ledger", a.cookie, "PUT", cash);
  const assetId = ledger.items[0].id;
  await data("/api/ledger", a.cookie, "PUT", { ...cash, id: assetId, amountCents: 33000000 });
  await call("/api/ledger", b.cookie, "PUT", { ...cash, id: assetId }, 400);
  await data("/api/ledger", b.cookie, "DELETE", { kind: "assets", id: assetId });
  assert.equal((await data("/api/ledger", a.cookie)).items[0].amountCents, 33000000);
  assert.equal((await data("/api/ledger", b.cookie)).items.length, 0);
  ledger = await data("/api/ledger", a.cookie, "PUT", { kind: "liabilities", name: "Test debt", category: "personal_loan", amountCents: 620000000, annualInterestBps: 750, minimumPaymentCents: 16000000 });
  const debtId = ledger.items.find(item => item.kind === "liabilities").id;
  const saved = (await data("/api/financial-profile", a.cookie)).inputs;
  assert.equal(saved.savingsCents, 33000000);
  assert.equal(saved.loanBalanceCents, 620000000);
  await data("/api/financial-profile", a.cookie, "PUT", { inputs: { ...saved, monthlyIncomeCents: 190000000 } });
  assert.equal((await data("/api/ledger", a.cookie)).items.length, 2, "Profile save must not duplicate detailed assets or debts");
  const goal = { name: "Emergency", goalType: "emergency_fund", targetAmountCents: 50000000, currentAmountCents: 33000000 };
  let full = await data("/api/goals", a.cookie, "POST", goal);
  const goalId = full.goals.find(item => item.goalType === "emergency_fund").id;
  full = await data("/api/goals", a.cookie, "POST", { ...goal, id: goalId, name: "Emergency updated", targetAmountCents: 60000000 });
  assert.equal(full.goals.find(item => item.id === goalId).name, "Emergency updated");
  assert.equal(full.financialData.inputs.targetAmountCents, inputs.targetAmountCents, "Non-home goals must not change mortgage inputs");
  await call("/api/goals", a.cookie, "POST", { ...goal, targetDate: "2026-02-30" }, 400);
  const routes = (await data("/api/scenarios", a.cookie, "POST", { inputs: saved })).routeScenarios;
  assert.equal(routes.length, 4);
  await call("/api/scenarios", a.cookie, "POST", { inputs: { ...saved, minimumPaymentCents: 1 } }, 400);
  const simulations = (await data("/api/simulations/home-purchase", a.cookie, "POST", { inputs: saved, termYears: 25 })).simulations;
  assert.equal(simulations[0].inputs.termYears, 25);
  for (const [type, inputs] of [
    ["car_purchase", { priceCents: 1200000, downPaymentCents: 0, annualInterestBps: 0, termMonths: 12, feesCents: 0 }],
    ["debt_consolidation", { balanceCents: 1200000, currentAnnualInterestBps: 0, currentPaymentCents: 100000, annualInterestBps: 500, termMonths: 24, feesCents: 1000 }],
    ["invest_vs_debt", { amountCents: 100000, annualInterestBps: 500, returnBps: 500, termMonths: 12 }],
    ["salary_change", { currentIncomeCents: 100000, newIncomeCents: 110000, expensesCents: 80000 }],
    ["aguinaldo", { amountCents: 100000, debtCents: 20000, savingsCents: 30000 }],
  ]) {
    const result = await data("/api/simulations", a.cookie, "POST", { type, inputs });
    assert.ok(result.results.length);
    assert.ok(result.simulations.some(item => item.simulationType === type));
  }
  const family = (await data("/api/family", a.cookie, "POST")).family;
  assert.equal(family.members.length, 1);
  assert.equal((await data("/api/family", a.cookie, "PATCH", { name: "Renamed family" })).family.name, "Renamed family");
  assert.equal((await data("/api/app-data", b.cookie)).family.householdId, null);
  await data("/api/financial-profile", b.cookie, "PUT", { inputs: { ...inputs, monthlyIncomeCents: 50000000 } });
  await data("/api/family", a.cookie, "PATCH", { operation: "invite", email: b.email });
  const invitation = (await data("/api/app-data", b.cookie)).invitations[0];
  assert.ok(invitation);
  assert.equal((await data("/api/app-data", a.cookie)).family.monthlyIncomeCents, 190000000, "Unaccepted invitations must not share financial totals");
  await call("/api/family", a.cookie, "PATCH", { operation: "accept", id: invitation.id }, 400);
  await data("/api/family", b.cookie, "PATCH", { operation: "accept", id: invitation.id });
  assert.equal((await data("/api/app-data", a.cookie)).family.monthlyIncomeCents, 240000000);
  await data("/api/family", b.cookie, "DELETE");
  assert.equal((await data("/api/app-data", a.cookie)).family.householdId, family.householdId, "Non-owner cannot archive family");
  await data("/api/family", a.cookie, "PATCH", { operation: "remove", id: invitation.id });
  assert.equal((await data("/api/app-data", b.cookie)).family.householdId, null);
  const messages = (await data("/api/advisor", a.cookie, "POST", { question: "Como esta mi fondo?" })).advisorMessages;
  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, "user");
  assert.equal((await data("/api/app-data", b.cookie)).advisorMessages.length, 0);
  await data("/api/notifications/read", a.cookie, "POST");
  full = await data("/api/app-data", a.cookie);
  assert.ok(full.notifications.every(item => item.readAt));
  for (const [kind,id] of [["goals",goalId], ["scenarios",routes[0].id], ["simulations",simulations[0].id]]) {
    await data("/api/records/" + kind + "/" + id, b.cookie, "DELETE");
    const retained = await data("/api/app-data", a.cookie);
    assert.ok((kind === "scenarios" ? retained.routeScenarios : retained[kind]).some(item => item.id === id), "Cross-user delete must not delete " + kind);
    await data("/api/records/" + kind + "/" + id, a.cookie, "DELETE");
    const removed = await data("/api/app-data", a.cookie);
    assert.ok(!(kind === "scenarios" ? removed.routeScenarios : removed[kind]).some(item => item.id === id));
  }
  await data("/api/advisor", a.cookie, "DELETE");
  await data("/api/family", a.cookie, "DELETE");
  await data("/api/ledger", a.cookie, "DELETE", { kind: "assets", id: assetId });
  await data("/api/ledger", a.cookie, "DELETE", { kind: "liabilities", id: debtId });
  full = await data("/api/app-data", a.cookie);
  assert.equal(full.advisorMessages.length, 0);
  assert.equal(full.family.householdId, null);
  assert.equal(full.ledger.length, 0);
  assert.equal(full.financialData.inputs.loanBalanceCents, 0);
  await call("/app", a.cookie);
  await data("/api/auth/logout", a.cookie, "POST");
  await call("/api/app-data", a.cookie, "GET", undefined, 401);
  console.log("PASS: " + checks + " HTTP checks, database persistence, updates, deletions, isolation, launch gate, logout.");
} finally {
  for (const user of users) {
    await sql`DELETE FROM households WHERE created_by_user_id IN (SELECT id FROM users WHERE email = ${user.email})`;
    await sql`DELETE FROM audit_events WHERE user_id IN (SELECT id FROM users WHERE email = ${user.email})`;
    await sql`DELETE FROM users WHERE email = ${user.email}`;
  }
  console.log("Temporary test accounts and their product data removed.");
}
