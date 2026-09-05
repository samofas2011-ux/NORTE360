export const SITE_GATE_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-norte360_gate" : "norte360_gate";

const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signPayload(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));

  return toHex(signature);
}

export async function createSiteGateToken(secret: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + ONE_WEEK_SECONDS;
  const payload = String(expiresAt);
  const signature = await signPayload(payload, secret);

  return {
    token: `${payload}.${signature}`,
    maxAge: ONE_WEEK_SECONDS,
  };
}

export async function verifySiteGateToken(token: string | undefined, secret: string | undefined) {
  if (!token || !secret) {
    return false;
  }

  const [expiresAt, signature] = token.split(".");
  const expiresAtNumber = Number(expiresAt);

  if (!expiresAt || !signature || !Number.isFinite(expiresAtNumber)) {
    return false;
  }

  if (expiresAtNumber < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = await signPayload(expiresAt, secret);
  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
}
