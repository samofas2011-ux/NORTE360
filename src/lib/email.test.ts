import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emailConfigured, sendTransactionalEmail } from "./email";

describe("Cloudflare account email adapter", () => {
  beforeEach(() => {
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "test-account");
    vi.stubEnv("CLOUDFLARE_EMAIL_TOKEN", "test-only");
    vi.stubEnv("EMAIL_FROM", "accounts@example.com");
    vi.stubEnv("APP_BASE_URL", "https://example.com");
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it("requires complete HTTPS configuration", () => {
    expect(emailConfigured()).toBe(true);
    vi.stubEnv("APP_BASE_URL", "http://example.com");
    expect(emailConfigured()).toBe(false);
    vi.stubEnv("APP_BASE_URL", "https://user:password@example.com");
    expect(emailConfigured()).toBe(false);
  });
  it("submits text and HTML via the server-only provider contract", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({success:true,result:{queued:["recipient@example.com"],permanent_bounces:[]}}));
    vi.stubGlobal("fetch",fetch);
    await sendTransactionalEmail("recipient@example.com","Confirm","Plain body","<p>HTML</p>");
    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain("/accounts/test-account/email/sending/send");
    expect(JSON.parse(options.body)).toMatchObject({from:{address:"accounts@example.com",name:"Norte360"},text:"Plain body",html:"<p>HTML</p>"});
  });
  it("does not report success on provider rejection or permanent bounce", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({success:false},{status:403})));
    await expect(sendTransactionalEmail("recipient@example.com","S","T")).rejects.toThrow();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({success:true,result:{permanent_bounces:["recipient@example.com"]}})));
    await expect(sendTransactionalEmail("recipient@example.com","S","T")).rejects.toThrow();
  });
  it("does not contact the provider without credentials", async () => {
    vi.stubEnv("CLOUDFLARE_EMAIL_TOKEN", "");
    const fetch = vi.fn(); vi.stubGlobal("fetch",fetch);
    await expect(sendTransactionalEmail("recipient@example.com","S","T")).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});
