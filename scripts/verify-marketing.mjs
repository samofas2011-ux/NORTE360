import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd());
const base = 'http://localhost:3012';
const expires = String(Math.floor(Date.now() / 1000) + 300);
assert.ok(process.env.SITE_GATE_SECRET, 'Local private gate must be configured');
const signature = createHmac('sha256', process.env.SITE_GATE_SECRET).update(expires).digest('hex');
const headers = { Cookie: `norte360_gate=${expires}.${signature}` };
let checks = 0;
for (const path of ['/', '/login', '/create-account', '/app']) {
  const res = await fetch(base + path, { redirect: 'manual' });
  assert.equal(res.status, 307, `${path}: public access must be gated`);
  assert.ok(res.headers.get('location').includes('/coming-soon'));
  checks += 2;
}
for (const path of ['/', '/login', '/create-account']) {
  const res = await fetch(base + path, { headers, redirect: 'manual' });
  assert.equal(res.status, 200, `${path}: gate-authorized access`);
  assert.match(res.headers.get('x-robots-tag'), /noindex/);
  checks += 2;
}
for (const extra of [{}, { headers }]) {
  const res = await fetch(base + '/api/app-data', { ...extra, redirect: 'manual' });
  assert.equal(res.status, 401, 'Personal data requires an account session even with a gate cookie');
  checks++;
}
const html = await (await fetch(base, { headers })).text();
for (const id of ['contenido', 'producto', 'funciones', 'confianza', 'preguntas', 'acceso', 'product-panel']) {
  assert.ok(html.includes(`id="${id}"`), `Missing target: ${id}`); checks++;
}
for (const phrase of ['Mi Panorama', 'Mi Norte', 'Mis Rutas', 'Decision Lab', 'Mi Familia', 'Norte360 Advisor', 'Datos ilustrativos', 'href="/login"', 'href="/create-account"']) {
  assert.ok(html.includes(phrase), `Missing marketing content: ${phrase}`); checks++;
}
assert.equal((html.match(/role="tab"/g) || []).length, 4); checks++;
assert.equal((html.match(/<details/g) || []).length, 9); checks++;
assert.ok(!html.includes(process.env.SITE_GATE_SECRET)); checks++;
console.log(`PASS: ${checks} marketing content, navigation target, private-gate and account-boundary checks. No database writes.`);
