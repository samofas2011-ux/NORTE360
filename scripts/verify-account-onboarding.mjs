import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash, createHmac } from 'node:crypto';
import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
nextEnv.loadEnvConfig(process.cwd());
// This suite never sends email. A configured provider requires a separate controlled-inbox test.
assert.ok(!process.env.CLOUDFLARE_EMAIL_TOKEN, 'Run only in an environment without live email delivery');
const sql = neon(process.env.DATABASE_URL);
const id = randomUUID(), email = `account-test-${id}@example.invalid`;
const fallbackEmail = `fallback-${id}@example.invalid`;
const oldPassword = 'Private-testing-password-2026';
const nextPassword = 'Changed-testing-password-2026';
const expiry = String(Math.floor(Date.now()/1000)+300);
const gate = `norte360_gate=${expiry}.${createHmac('sha256',process.env.SITE_GATE_SECRET).update(expiry).digest('hex')}`;
const base = 'http://localhost:3012';
const headers = {'content-type':'application/json',origin:base,cookie:gate,'x-forwarded-for':`onboarding-${id}`};
const hash = value => createHash('sha256').update(value).digest('hex');
const post = (path,body, extra={}) => fetch(base+path,{method:'POST',headers:{...headers,...extra},body:JSON.stringify(body),redirect:'manual'});
let checks=0;
const status = (response, expected) => { assert.equal(response.status,expected); checks++; };
async function token(purpose, expired=false) {
  const raw=randomBytes(32).toString('hex');
  await sql`INSERT INTO account_action_tokens(token_hash,user_id,purpose,expires_at) VALUES(${hash(raw)},${id},${purpose},${new Date(Date.now()+(expired?-60000:60000)).toISOString()})`;
  return raw;
}
try {
  await sql`INSERT INTO users(id,name,email,password_hash,email_verification_required) VALUES(${id},'Disposable account test',${email},${await bcrypt.hash(oldPassword,12)},TRUE)`;
  status(await post('/api/auth/login',{email,password:oldPassword}),403);
  const verification=await token('verify');
  status(await post('/api/account-action',{token:verification,purpose:'verify'}),200);
  status(await post('/api/account-action',{token:verification,purpose:'verify'}),400);
  const welcome=await sql`SELECT kind FROM account_email_outbox WHERE user_id=${id}`;
  assert.deepEqual(welcome.map(row=>row.kind),['welcome']); checks++;
  const login=await post('/api/auth/login',{email,password:oldPassword}); status(login,200);
  const sessionCookie=login.headers.get('set-cookie').split(';')[0];
  status(await post('/api/account-action',{token:await token('reset',true),purpose:'reset',password:nextPassword}),400);
  const reset=await token('reset');
  status(await post('/api/account-action',{token:reset,purpose:'reset',password:nextPassword}),200);
  status(await post('/api/account-action',{token:reset,purpose:'reset',password:nextPassword}),400);
  status(await fetch(base+'/api/account',{headers:{cookie:`${gate}; ${sessionCookie}`}}),401);
  status(await post('/api/auth/login',{email,password:oldPassword}),401);
  status(await post('/api/auth/login',{email,password:nextPassword}),200);
  const notifications=await sql`SELECT kind FROM account_email_outbox WHERE user_id=${id} ORDER BY kind`;
  assert.deepEqual(notifications.map(row=>row.kind),['password_changed','welcome']);checks++;
  const fallbackRegistration = await post('/api/auth/register',{name:'Another test',email:fallbackEmail,password:nextPassword});
  status(fallbackRegistration,201);
  assert.equal((await fallbackRegistration.clone().json()).user.email, fallbackEmail); checks++;
  assert.match(fallbackRegistration.headers.get('set-cookie') || '', /norte360_session=/); checks++;
  console.log(`PASS: ${checks} database-backed confirmation, replay/expiry, login, recovery, revocation, outbox and private-gate registration fallback checks. No emails sent.`);
} finally {
  await sql`DELETE FROM audit_events WHERE user_id=${id}`;
  await sql`DELETE FROM users WHERE id=${id}`;
  await sql`DELETE FROM users WHERE email=${fallbackEmail}`;
  for(const action of ['login','recovery','register']) {
    const ipHash=hash(`onboarding-${id}`);
    const address=action==='recovery'?'anonymous':action==='register'?`other-${email}`:email;
    await sql`DELETE FROM auth_rate_limits WHERE key_hash=${hash(`${action}:${ipHash}:${address}`)}`;
  }
  console.log('Temporary account, tokens, sessions and queued notifications removed.');
}
