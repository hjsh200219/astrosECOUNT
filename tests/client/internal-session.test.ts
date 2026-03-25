import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InternalApiSession } from "../../src/client/internal-session.js";
import type { InternalApiConfig } from "../../src/config.js";

// Re-export for test helper type
export type { InternalApiConfig };

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeConfig(overrides?: Partial<InternalApiConfig>): InternalApiConfig {
  return {
    ECOUNT_ZONE: "AU1",
    ECOUNT_COM_CODE: "TEST001",
    ECOUNT_WEB_ID: "admin",
    ECOUNT_WEB_PW: "password123",
    ...overrides,
  };
}

/** Helper: mock a successful login response returning ec_req_sid */
function mockLoginSuccess(sid = "test-ec-req-sid-abc123") {
  // Step 1: Login page GET → returns HTML with Set-Cookie
  // Step 2: Login POST → returns JSON with ec_req_sid in Set-Cookie
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      Status: "200",
      Data: { result: true },
    }),
    headers: new Headers({
      "set-cookie": `ec_req_sid=${sid}; Path=/; HttpOnly`,
    }),
  });
}

function mockLoginFailure(message = "아이디 또는 비밀번호가 올바르지 않습니다") {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      Status: "400",
      Data: { result: false, message },
    }),
    headers: new Headers(),
  });
}

function mockNetworkError() {
  mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
}

describe("InternalApiSession", () => {
  let session: InternalApiSession;

  beforeEach(() => {
    vi.clearAllMocks();
    session = new InternalApiSession(makeConfig());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("login", () => {
    it("should login and extract ec_req_sid from response", async () => {
      mockLoginSuccess("my-session-id-xyz");

      const sid = await session.login();

      expect(sid).toBe("my-session-id-xyz");
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify POST body contains credentials
      const call = mockFetch.mock.calls[0];
      expect(call[1].method).toBe("POST");
      const body = JSON.parse(call[1].body);
      expect(body).toMatchObject({
        COM_CODE: "TEST001",
        USER_ID: "admin",
        USER_PW: "password123",
      });
    });

    it("should throw EcountApiError on invalid credentials", async () => {
      mockLoginFailure();

      await expect(session.login()).rejects.toThrow("로그인 실패");
    });

    it("should throw NetworkError on connection failure", async () => {
      mockNetworkError();

      await expect(session.login()).rejects.toThrow("연결 실패");
    });
  });

  describe("getSessionId", () => {
    it("should return cached session on second call without re-login", async () => {
      mockLoginSuccess("cached-sid");

      const sid1 = await session.getSessionId();
      const sid2 = await session.getSessionId();

      expect(sid1).toBe("cached-sid");
      expect(sid2).toBe("cached-sid");
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only one login call
    });

    it("should deduplicate concurrent login calls", async () => {
      mockLoginSuccess("dedup-sid");

      const [sid1, sid2, sid3] = await Promise.all([
        session.getSessionId(),
        session.getSessionId(),
        session.getSessionId(),
      ]);

      expect(sid1).toBe("dedup-sid");
      expect(sid2).toBe("dedup-sid");
      expect(sid3).toBe("dedup-sid");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("session invalidation and refresh", () => {
    it("should re-login after invalidation", async () => {
      mockLoginSuccess("first-sid");
      await session.getSessionId();

      session.invalidateSession();

      mockLoginSuccess("second-sid");
      const newSid = await session.getSessionId();

      expect(newSid).toBe("second-sid");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("forceRefresh should invalidate and re-login", async () => {
      mockLoginSuccess("old-sid");
      await session.getSessionId();

      mockLoginSuccess("refreshed-sid");
      const newSid = await session.forceRefresh();

      expect(newSid).toBe("refreshed-sid");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("session expiry detection", () => {
    it("should detect session expired error from response", () => {
      expect(session.isSessionExpired({ Status: "-1", Error: { Code: "SESSION_EXPIRED", Message: "expired" }, Errors: null, Data: null })).toBe(true);
      expect(session.isSessionExpired({ Status: "200", Error: null, Errors: null, Data: {} })).toBe(false);
    });

    it("should detect ec_req_sid invalid response", () => {
      expect(session.isSessionExpired({ Status: "-1", Error: { Code: "INVALID_SESSION", Message: "invalid" }, Errors: null, Data: null })).toBe(true);
    });
  });

  describe("getStatus", () => {
    it("should report no session initially", () => {
      const status = session.getStatus();
      expect(status.hasSession).toBe(false);
      expect(status.sessionIdPrefix).toBeNull();
    });

    it("should report active session after login", async () => {
      mockLoginSuccess("status-test-sid-12345678");
      await session.getSessionId();

      const status = session.getStatus();
      expect(status.hasSession).toBe(true);
      expect(status.sessionIdPrefix).toBe("status-t...");
    });
  });

  describe("session TTL", () => {
    it("should auto-invalidate after TTL expires", async () => {
      vi.useFakeTimers();

      mockLoginSuccess("ttl-sid");
      await session.getSessionId();

      // Advance time past TTL (default 30 minutes)
      vi.advanceTimersByTime(31 * 60 * 1000);

      mockLoginSuccess("new-ttl-sid");
      const newSid = await session.getSessionId();

      expect(newSid).toBe("new-ttl-sid");
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });
});
