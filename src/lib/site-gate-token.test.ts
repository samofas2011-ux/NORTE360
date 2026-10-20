import { expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { createSiteGateToken, verifySiteGateToken } from "./site-gate-token";
it("accepts only current tokens signed by the configured gate secret", async () => {
  const secret = "test-only-private-gate-secret";
  const { token } = await createSiteGateToken(secret);
  expect(await verifySiteGateToken(token, secret)).toBe(true);
  expect(await verifySiteGateToken(token, "wrong")).toBe(false);
  expect(await verifySiteGateToken(token + ".extra", secret)).toBe(false);
  expect(await verifySiteGateToken(undefined, secret)).toBe(false);
  expect(await verifySiteGateToken(token, undefined)).toBe(false);
  const expired = String(Math.floor(Date.now() / 1000) - 100);
  const signature = createHmac("sha256", secret).update(expired).digest("hex");
  expect(await verifySiteGateToken(expired + "." + signature, secret)).toBe(false);
});
