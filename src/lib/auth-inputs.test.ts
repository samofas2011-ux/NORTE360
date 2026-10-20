import { describe, it, expect } from "vitest";
import { readAuthBody, validEmail, validNewPassword } from "./auth-inputs";
import { accountEmail } from "./account-emails";

describe("account onboarding validation", () => {
  it("validates email structure and bounds", () => {
    expect(validEmail("person@example.com")).toBe(true);
    for (const value of [null, "a@b", "a@@example.com", "a b@example.com", "<a>@example.com", "x".repeat(255)]) expect(validEmail(value)).toBe(false);
  });
  it("rejects short passwords and bcrypt truncation including Unicode", () => {
    expect(validNewPassword("a".repeat(15))).toBe(true);
    expect(validNewPassword("a".repeat(72))).toBe(true);
    expect(validNewPassword("a".repeat(73))).toBe(false);
    expect(validNewPassword("é".repeat(37))).toBe(false);
    expect(validNewPassword("a".repeat(14))).toBe(false);
  });
  it("requires bounded JSON object requests", async () => {
    const request = (body: string, type = "application/json") => new Request("https://example.com", { method: "POST", headers: { "content-type": type }, body });
    expect(await readAuthBody(request('{"name":"Test"}'))).toEqual({name:"Test"});
    for (const body of ["null", "[]", "bad", JSON.stringify({ data: "x".repeat(8200) })]) await expect(readAuthBody(request(body))).rejects.toThrow();
    await expect(readAuthBody(request("{}", "text/plain"))).rejects.toThrow();
  });
  it("renders all transactional templates with text and escaped HTML", () => {
    for (const kind of ["verify", "reset", "welcome", "password_changed"] as const) {
      const email = accountEmail(kind, 'https://example.com/?value="<script>');
      expect(email.subject).toBeTruthy();
      expect(email.text).toContain("https://example.com");
      expect(email.html).toContain("Norte360");
      expect(email.html).not.toContain("<script>");
    }
  });
});
