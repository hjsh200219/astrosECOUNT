import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InternalApiClient } from "../../src/client/internal-api-client.js";
import type { InternalApiSession } from "../../src/client/internal-session.js";
import type { CircuitBreaker } from "../../src/client/circuit-breaker.js";
import { CircuitBreakerOpen } from "../../src/client/circuit-breaker.js";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockSession(sid = "mock-ec-req-sid"): InternalApiSession {
  return {
    getSessionId: vi.fn().mockResolvedValue(sid),
    invalidateSession: vi.fn(),
    forceRefresh: vi.fn().mockResolvedValue("refreshed-sid"),
    isSessionExpired: vi.fn().mockReturnValue(false),
    getStatus: vi.fn().mockReturnValue({ hasSession: true, sessionIdPrefix: "mock-ec-..." }),
    login: vi.fn().mockResolvedValue(sid),
  } as unknown as InternalApiSession;
}

function mockCircuitBreaker(): CircuitBreaker {
  return {
    call: vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
    getState: vi.fn().mockReturnValue("CLOSED"),
    getStatus: vi.fn().mockReturnValue({ state: "CLOSED", failureCount: 0, lastFailureTime: null }),
  } as unknown as CircuitBreaker;
}

function mockApiResponse(data: unknown = { Data: [{ SLIP_NO: "S001" }], TotalCount: 1 }) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      Status: "200",
      Data: data,
      Error: null,
      Errors: null,
    }),
  });
}

function mockApiSessionExpired() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      Status: "-1",
      Data: null,
      Error: { Code: "SESSION_EXPIRED", Message: "세션이 만료되었습니다" },
      Errors: null,
    }),
  });
}

describe("InternalApiClient", () => {
  let session: InternalApiSession;
  let cb: CircuitBreaker;
  let client: InternalApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    session = mockSession();
    cb = mockCircuitBreaker();
    client = new InternalApiClient(session, cb, "AU1");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("post", () => {
    it("should call internal API with KeyPack-encoded params and ec_req_sid cookie", async () => {
      mockApiResponse({ Data: [{ SLIP_NO: "S001" }], TotalCount: 1 });

      const result = await client.post("/Account/GetSaleSlipStatusList", {
        FROM_DATE: "20260101",
        TO_DATE: "20260331",
      });

      expect(result).toEqual({ Data: [{ SLIP_NO: "S001" }], TotalCount: 1 });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify request includes ec_req_sid cookie
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain("/Account/GetSaleSlipStatusList");
      expect(opts.headers).toHaveProperty("Cookie");
      expect(opts.headers.Cookie).toContain("ec_req_sid=mock-ec-req-sid");

      // Verify body contains __$KeyPack
      expect(opts.body).toBeTruthy();
      const bodyParams = new URLSearchParams(opts.body);
      expect(bodyParams.has("__$KeyPack")).toBe(true);
    });

    it("should pass through circuit breaker", async () => {
      mockApiResponse();
      await client.post("/Account/GetSaleSlipStatusList", { FROM_DATE: "20260101", TO_DATE: "20260331" });
      expect(cb.call).toHaveBeenCalledTimes(1);
    });

    it("should throw CircuitBreakerOpen when breaker is open", async () => {
      const openCb = mockCircuitBreaker();
      (openCb.call as ReturnType<typeof vi.fn>).mockRejectedValue(new CircuitBreakerOpen());

      const openClient = new InternalApiClient(session, openCb, "AU1");
      await expect(
        openClient.post("/Account/GetSaleSlipStatusList", { FROM_DATE: "20260101", TO_DATE: "20260331" })
      ).rejects.toThrow(CircuitBreakerOpen);
    });
  });

  describe("session retry on expiry", () => {
    it("should retry once with refreshed session when server returns session expired", async () => {
      // Make session detect expiry
      (session.isSessionExpired as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);
      // First call returns expired, second succeeds
      mockApiSessionExpired();
      mockApiResponse({ Data: [{ SLIP_NO: "S002" }], TotalCount: 1 });

      // Override circuit breaker to actually call fn (not mock)
      const realCb = mockCircuitBreaker();
      (realCb.call as ReturnType<typeof vi.fn>).mockImplementation(async (fn: () => Promise<unknown>) => fn());
      const retryClient = new InternalApiClient(session, realCb, "AU1");

      const result = await retryClient.post("/Account/GetSaleSlipStatusList", {
        FROM_DATE: "20260101",
        TO_DATE: "20260331",
      });

      expect(result).toEqual({ Data: [{ SLIP_NO: "S002" }], TotalCount: 1 });
      expect(session.forceRefresh).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("error handling", () => {
    it("should throw EcountApiError on API error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          Status: "400",
          Data: null,
          Error: { Code: "INVALID_PARAM", Message: "잘못된 파라미터" },
          Errors: null,
        }),
      });

      await expect(
        client.post("/Account/GetSaleSlipStatusList", { FROM_DATE: "invalid" })
      ).rejects.toThrow("잘못된 파라미터");
    });

    it("should throw NetworkError on fetch failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      await expect(
        client.post("/Account/GetSaleSlipStatusList", { FROM_DATE: "20260101" })
      ).rejects.toThrow("연결 실패");
    });
  });

  describe("KeyPack version header", () => {
    it("should include X-KeyPack-Version header in requests", async () => {
      mockApiResponse();
      await client.post("/Account/GetSaleSlipStatusList", { FROM_DATE: "20260101", TO_DATE: "20260331" });

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.headers).toHaveProperty("X-KeyPack-Version");
    });
  });
});
