import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SessionManager } from "../../src/client/session-manager.js";
import type { EcountConfig } from "../../src/config.js";

const mockConfig: EcountConfig = {
  ECOUNT_COM_CODE: "TEST",
  ECOUNT_USER_ID: "user",
  ECOUNT_API_CERT_KEY: "key123",
  ECOUNT_ZONE: "AU1",
  ECOUNT_LAN_TYPE: "ko-KR",
};

function mockFetchSuccess(sessionId = "test-session-id-12345") {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        Status: "200",
        Error: null,
        Data: { Datas: { SESSION_ID: sessionId } },
      }),
  });
}

function mockFetchFailure(errorCode = "AUTH_FAIL", message = "인증 실패") {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        Status: "500",
        Error: { ErrorCode: errorCode, Message: message },
        Data: null,
      }),
  });
}

describe("SessionManager", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("login", () => {
    it("should obtain SESSION_ID on successful login", async () => {
      globalThis.fetch = mockFetchSuccess("abc123") as unknown as typeof fetch;
      const manager = new SessionManager(mockConfig);

      const sessionId = await manager.login();
      expect(sessionId).toBe("abc123");
    });

    it("should throw EcountApiError on login failure", async () => {
      globalThis.fetch = mockFetchFailure("AUTH_FAIL", "인증 실패") as unknown as typeof fetch;
      const manager = new SessionManager(mockConfig);

      await expect(manager.login()).rejects.toThrow("인증 실패");
    });

    it("should throw NetworkError on fetch failure", async () => {
      globalThis.fetch = vi
        .fn()
        .mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
      const manager = new SessionManager(mockConfig);

      await expect(manager.login()).rejects.toThrow("ECOUNT 서버 연결 실패");
    });

    it("should call correct URL with config params", async () => {
      const mockFn = mockFetchSuccess();
      globalThis.fetch = mockFn as unknown as typeof fetch;
      const manager = new SessionManager(mockConfig);

      await manager.login();

      expect(mockFn).toHaveBeenCalledWith(
        "https://sboapiAU1.ecount.com/OAPI/V2/OAPILogin",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("TEST"),
        })
      );
    });
  });

  describe("getSessionId", () => {
    it("should return cached session on second call", async () => {
      const mockFn = mockFetchSuccess("cached-session");
      globalThis.fetch = mockFn as unknown as typeof fetch;
      const manager = new SessionManager(mockConfig);

      const first = await manager.getSessionId();
      const second = await manager.getSessionId();

      expect(first).toBe("cached-session");
      expect(second).toBe("cached-session");
      expect(mockFn).toHaveBeenCalledTimes(1); // Only one login
    });

    it("should deduplicate concurrent login calls", async () => {
      let resolveLogin!: (value: unknown) => void;
      const slowFetch = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolveLogin = resolve;
        });
      });
      globalThis.fetch = slowFetch as unknown as typeof fetch;
      const manager = new SessionManager(mockConfig);

      // Fire 3 concurrent calls
      const p1 = manager.getSessionId();
      const p2 = manager.getSessionId();
      const p3 = manager.getSessionId();

      // Resolve the single fetch
      resolveLogin({
        ok: true,
        json: () =>
          Promise.resolve({
            Status: "200",
            Error: null,
            Data: { Datas: { SESSION_ID: "dedup-session" } },
          }),
      });

      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

      expect(r1).toBe("dedup-session");
      expect(r2).toBe("dedup-session");
      expect(r3).toBe("dedup-session");
      expect(slowFetch).toHaveBeenCalledTimes(1); // Only ONE fetch call
    });
  });

  describe("isSessionExpiredError", () => {
    it("should detect SESSION_EXPIRED code", () => {
      const manager = new SessionManager(mockConfig);
      expect(
        manager.isSessionExpiredError({
          Status: "500",
          Error: { ErrorCode: "SESSION_EXPIRED", Message: "expired" },
          Data: null,
        })
      ).toBe(true);
    });

    it("should detect INVALID_SESSION code", () => {
      const manager = new SessionManager(mockConfig);
      expect(
        manager.isSessionExpiredError({
          Status: "500",
          Error: { ErrorCode: "INVALID_SESSION", Message: "invalid" },
          Data: null,
        })
      ).toBe(true);
    });

    it("should detect -1 error code", () => {
      const manager = new SessionManager(mockConfig);
      expect(
        manager.isSessionExpiredError({
          Status: "500",
          Error: { ErrorCode: "-1", Message: "invalid" },
          Data: null,
        })
      ).toBe(true);
    });

    it("should return false for non-expiry errors", () => {
      const manager = new SessionManager(mockConfig);
      expect(
        manager.isSessionExpiredError({
          Status: "500",
          Error: { ErrorCode: "INVALID_PARAM", Message: "bad param" },
          Data: null,
        })
      ).toBe(false);
    });

    it("should return false when no error", () => {
      const manager = new SessionManager(mockConfig);
      expect(
        manager.isSessionExpiredError({
          Status: "200",
          Error: null,
          Data: {},
        })
      ).toBe(false);
    });
  });

  describe("invalidateSession", () => {
    it("should clear session and require re-login", async () => {
      const mockFn = mockFetchSuccess("first-session");
      globalThis.fetch = mockFn as unknown as typeof fetch;
      const manager = new SessionManager(mockConfig);

      await manager.getSessionId();
      expect(manager.getStatus().hasSession).toBe(true);

      manager.invalidateSession();
      expect(manager.getStatus().hasSession).toBe(false);
    });
  });

  describe("getStatus", () => {
    it("should show no session initially", () => {
      const manager = new SessionManager(mockConfig);
      const status = manager.getStatus();
      expect(status.hasSession).toBe(false);
      expect(status.sessionIdPrefix).toBeNull();
    });

    it("should show session after login", async () => {
      globalThis.fetch = mockFetchSuccess("status-test-session") as unknown as typeof fetch;
      const manager = new SessionManager(mockConfig);

      await manager.login();
      const status = manager.getStatus();
      expect(status.hasSession).toBe(true);
      expect(status.sessionIdPrefix).toBe("status-t...");
    });
  });
});
