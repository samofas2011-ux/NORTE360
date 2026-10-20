import { neon } from "@neondatabase/serverless";

export type DbUser = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  email_verified_at: string | null;
  email_verification_required: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SessionWithUser = {
  id: string;
  expires_at: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
};

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not configured.");
  }
}

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new DatabaseNotConfiguredError();
  }
  return neon(url, { fetchOptions: { signal: AbortSignal.timeout(15000) } });
}

export async function ensureAuthSchema() {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_required BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      last_seen_at TIMESTAMPTZ,
      ip_hash TEXT,
      user_agent_hash TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ`;
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ`;
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_hash TEXT`;
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent_hash TEXT`;

  await sql`
    CREATE TABLE IF NOT EXISTS auth_rate_limits (
      key_hash TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 0,
      window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      ip_hash TEXT,
      user_agent_hash TEXT,
      metadata_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash)`;
  await sql`CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at)`;
  await sql`CREATE INDEX IF NOT EXISTS audit_events_user_id_created_at_idx ON audit_events(user_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS audit_events_event_type_created_at_idx ON audit_events(event_type, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS auth_rate_limits_expires_at_idx ON auth_rate_limits(expires_at)`;
}

export async function findUserByEmail(email: string) {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, email, name, password_hash, email_verified_at, email_verification_required, created_at, updated_at, deleted_at
    FROM users
    WHERE email = ${email}
      AND deleted_at IS NULL
    LIMIT 1
  `) as DbUser[];

  return rows[0] ?? null;
}

export async function createUser({
  id,
  email,
  name,
  passwordHash,
  verificationRequired = true,
}: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  verificationRequired?: boolean;
}) {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO users (id, email, name, password_hash, email_verification_required)
    VALUES (${id}, ${email}, ${name}, ${passwordHash}, ${verificationRequired})
    RETURNING id, email, name, password_hash, email_verified_at, email_verification_required, created_at, updated_at, deleted_at
  `) as DbUser[];

  return rows[0];
}

export async function createSession({
  id,
  userId,
  tokenHash,
  expiresAt,
  ipHash,
  userAgentHash,
}: {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipHash?: string;
  userAgentHash?: string;
}) {
  const sql = getSql();
  await sql`
    INSERT INTO sessions (id, user_id, token_hash, expires_at, ip_hash, user_agent_hash)
    VALUES (${id}, ${userId}, ${tokenHash}, ${expiresAt.toISOString()}, ${ipHash ?? null}, ${userAgentHash ?? null})
  `;
}

export async function findSessionByTokenHash(tokenHash: string) {
  const sql = getSql();
  const rows = (await sql`
    SELECT sessions.id, sessions.expires_at, users.id AS user_id, users.email, users.name
    FROM sessions
    INNER JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ${tokenHash}
      AND sessions.expires_at > NOW()
      AND sessions.revoked_at IS NULL
      AND users.deleted_at IS NULL
      AND (NOT users.email_verification_required OR users.email_verified_at IS NOT NULL)
    LIMIT 1
  `) as Array<{
      id: string;
      expires_at: string;
      user_id: string;
      email: string;
      name: string;
    }>;
  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    expires_at: row.expires_at,
    user: {
      id: row.user_id,
      email: row.email,
      name: row.name,
    },
  } satisfies SessionWithUser;
}

export async function deleteSessionByTokenHash(tokenHash: string) {
  const sql = getSql();
  await sql`UPDATE sessions SET revoked_at = NOW() WHERE token_hash = ${tokenHash}`;
}

export async function consumeRateLimit({
  keyHash,
  limit,
  windowSeconds,
}: {
  keyHash: string;
  limit: number;
  windowSeconds: number;
}) {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO auth_rate_limits (key_hash, attempts, window_start, expires_at, updated_at)
    VALUES (${keyHash}, 1, NOW(), NOW() + make_interval(secs => ${windowSeconds}), NOW())
    ON CONFLICT (key_hash) DO UPDATE SET
      attempts = CASE
        WHEN auth_rate_limits.window_start < NOW() - make_interval(secs => ${windowSeconds})
          THEN 1
        ELSE auth_rate_limits.attempts + 1
      END,
      window_start = CASE
        WHEN auth_rate_limits.window_start < NOW() - make_interval(secs => ${windowSeconds})
          THEN NOW()
        ELSE auth_rate_limits.window_start
      END,
      expires_at = NOW() + make_interval(secs => ${windowSeconds}),
      updated_at = NOW()
    RETURNING attempts
  `) as Array<{ attempts: number }>;

  return rows[0].attempts <= limit;
}

export async function recordAuditEvent({
  id,
  userId,
  eventType,
  ipHash,
  userAgentHash,
  metadata,
}: {
  id: string;
  userId?: string | null;
  eventType: string;
  ipHash?: string;
  userAgentHash?: string;
  metadata?: Record<string, unknown>;
}) {
  const sql = getSql();
  await sql`
    INSERT INTO audit_events (id, user_id, event_type, ip_hash, user_agent_hash, metadata_json)
    VALUES (${id}, ${userId ?? null}, ${eventType}, ${ipHash ?? null}, ${userAgentHash ?? null}, ${metadata ? JSON.stringify(metadata) : null})
  `;
}
