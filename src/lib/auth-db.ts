import { neon } from "@neondatabase/serverless";

export type DbUser = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
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
  return neon(url);
}

export async function ensureAuthSchema() {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash)`;
  await sql`CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)`;
}

export async function findUserByEmail(email: string) {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, email, name, password_hash, created_at
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `) as DbUser[];

  return rows[0] ?? null;
}

export async function createUser({
  id,
  email,
  name,
  passwordHash,
}: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}) {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO users (id, email, name, password_hash)
    VALUES (${id}, ${email}, ${name}, ${passwordHash})
    RETURNING id, email, name, password_hash, created_at
  `) as DbUser[];

  return rows[0];
}

export async function createSession({
  id,
  userId,
  tokenHash,
  expiresAt,
}: {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  const sql = getSql();
  await sql`
    INSERT INTO sessions (id, user_id, token_hash, expires_at)
    VALUES (${id}, ${userId}, ${tokenHash}, ${expiresAt.toISOString()})
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
  await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`;
}
