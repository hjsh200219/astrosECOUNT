import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, loadInternalApiConfig, type InternalApiConfig } from "../src/config.js";

describe("loadInternalApiConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Set required base config
    process.env.ECOUNT_COM_CODE = "TEST001";
    process.env.ECOUNT_USER_ID = "testuser";
    process.env.ECOUNT_API_CERT_KEY = "test-cert-key";
    process.env.ECOUNT_ZONE = "AU1";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return null when WEB_ID/WEB_PW are not set", () => {
    const config = loadInternalApiConfig();
    expect(config).toBeNull();
  });

  it("should return InternalApiConfig when WEB_ID and WEB_PW are set", () => {
    process.env.ECOUNT_WEB_ID = "admin";
    process.env.ECOUNT_WEB_PW = "secret123";

    const config = loadInternalApiConfig();
    expect(config).not.toBeNull();
    expect(config!.ECOUNT_WEB_ID).toBe("admin");
    expect(config!.ECOUNT_WEB_PW).toBe("secret123");
    expect(config!.ECOUNT_ZONE).toBe("AU1");
    expect(config!.ECOUNT_COM_CODE).toBe("TEST001");
  });

  it("should return null when only WEB_ID is set (WEB_PW missing)", () => {
    process.env.ECOUNT_WEB_ID = "admin";
    // No WEB_PW

    const config = loadInternalApiConfig();
    expect(config).toBeNull();
  });

  it("should return null when only WEB_PW is set (WEB_ID missing)", () => {
    process.env.ECOUNT_WEB_PW = "secret123";
    // No WEB_ID

    const config = loadInternalApiConfig();
    expect(config).toBeNull();
  });

  it("should inherit ZONE and COM_CODE from base config", () => {
    process.env.ECOUNT_ZONE = "KR1";
    process.env.ECOUNT_COM_CODE = "PROD002";
    process.env.ECOUNT_WEB_ID = "admin";
    process.env.ECOUNT_WEB_PW = "secret";

    const config = loadInternalApiConfig();
    expect(config!.ECOUNT_ZONE).toBe("KR1");
    expect(config!.ECOUNT_COM_CODE).toBe("PROD002");
  });
});
