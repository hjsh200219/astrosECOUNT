import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should load valid config from environment", () => {
    process.env.ECOUNT_COM_CODE = "TEST_COMPANY";
    process.env.ECOUNT_USER_ID = "testuser";
    process.env.ECOUNT_API_CERT_KEY = "testkey123";
    process.env.ECOUNT_ZONE = "AU1";
    process.env.ECOUNT_LAN_TYPE = "ko-KR";

    const config = loadConfig();
    expect(config.ECOUNT_COM_CODE).toBe("TEST_COMPANY");
    expect(config.ECOUNT_USER_ID).toBe("testuser");
    expect(config.ECOUNT_API_CERT_KEY).toBe("testkey123");
    expect(config.ECOUNT_ZONE).toBe("AU1");
    expect(config.ECOUNT_LAN_TYPE).toBe("ko-KR");
  });

  it("should throw when required env vars are missing", () => {
    delete process.env.ECOUNT_COM_CODE;
    delete process.env.ECOUNT_USER_ID;
    delete process.env.ECOUNT_API_CERT_KEY;
    delete process.env.ECOUNT_ZONE;

    expect(() => loadConfig()).toThrow("ECOUNT 환경 변수 설정 오류");
  });

  it("should use default values for optional fields", () => {
    process.env.ECOUNT_COM_CODE = "TEST";
    process.env.ECOUNT_USER_ID = "user";
    process.env.ECOUNT_API_CERT_KEY = "key";
    process.env.ECOUNT_ZONE = "AU1";
    delete process.env.ECOUNT_LAN_TYPE;

    const config = loadConfig();
    expect(config.ECOUNT_LAN_TYPE).toBe("ko-KR");
  });

  it("should reject empty required fields", () => {
    process.env.ECOUNT_COM_CODE = "";
    process.env.ECOUNT_USER_ID = "user";
    process.env.ECOUNT_API_CERT_KEY = "key";
    process.env.ECOUNT_ZONE = "AU1";

    expect(() => loadConfig()).toThrow("ECOUNT 환경 변수 설정 오류");
  });
});
