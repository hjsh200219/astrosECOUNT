import { describe, it, expect, vi, beforeEach } from "vitest";
import { SessionOrchestrator } from "../../src/client/session-orchestrator.js";
import type { SessionManager } from "../../src/client/session-manager.js";
import type { InternalApiSession } from "../../src/client/internal-session.js";

/** Create a mock SessionManager (Open API) */
function mockOpenApiSession(sessionId = "open-api-sid"): SessionManager {
  return {
    getSessionId: vi.fn().mockResolvedValue(sessionId),
    invalidateSession: vi.fn(),
    forceRefresh: vi.fn().mockResolvedValue(sessionId),
    isSessionExpiredError: vi.fn().mockReturnValue(false),
    getStatus: vi.fn().mockReturnValue({ hasSession: true, sessionIdPrefix: sessionId.substring(0, 8) + "..." }),
    login: vi.fn().mockResolvedValue(sessionId),
  } as unknown as SessionManager;
}

/** Create a mock InternalApiSession */
function mockInternalSession(sessionId = "internal-sid"): InternalApiSession {
  return {
    getSessionId: vi.fn().mockResolvedValue(sessionId),
    invalidateSession: vi.fn(),
    forceRefresh: vi.fn().mockResolvedValue(sessionId),
    isSessionExpired: vi.fn().mockReturnValue(false),
    getStatus: vi.fn().mockReturnValue({ hasSession: true, sessionIdPrefix: sessionId.substring(0, 8) + "..." }),
    login: vi.fn().mockResolvedValue(sessionId),
  } as unknown as InternalApiSession;
}

describe("SessionOrchestrator", () => {
  let openApi: SessionManager;
  let internalApi: InternalApiSession;
  let orchestrator: SessionOrchestrator;

  beforeEach(() => {
    openApi = mockOpenApiSession();
    internalApi = mockInternalSession();
    orchestrator = new SessionOrchestrator(openApi, internalApi);
  });

  describe("getOpenApiSessionId", () => {
    it("should delegate to Open API session manager", async () => {
      const sid = await orchestrator.getOpenApiSessionId();
      expect(sid).toBe("open-api-sid");
      expect(openApi.getSessionId).toHaveBeenCalledTimes(1);
    });
  });

  describe("getInternalSessionId", () => {
    it("should delegate to Internal API session", async () => {
      const sid = await orchestrator.getInternalSessionId();
      expect(sid).toBe("internal-sid");
      expect(internalApi.getSessionId).toHaveBeenCalledTimes(1);
    });

    it("should return null if internal session is not configured", async () => {
      const orchestratorNoInternal = new SessionOrchestrator(openApi, null);
      const sid = await orchestratorNoInternal.getInternalSessionId();
      expect(sid).toBeNull();
    });
  });

  describe("invalidateOpenApi", () => {
    it("should only invalidate Open API session", () => {
      orchestrator.invalidateOpenApi();
      expect(openApi.invalidateSession).toHaveBeenCalledTimes(1);
      expect(internalApi.invalidateSession).not.toHaveBeenCalled();
    });
  });

  describe("invalidateInternal", () => {
    it("should only invalidate Internal API session", () => {
      orchestrator.invalidateInternal();
      expect(internalApi.invalidateSession).toHaveBeenCalledTimes(1);
      expect(openApi.invalidateSession).not.toHaveBeenCalled();
    });
  });

  describe("invalidateAll", () => {
    it("should invalidate both sessions", () => {
      orchestrator.invalidateAll();
      expect(openApi.invalidateSession).toHaveBeenCalledTimes(1);
      expect(internalApi.invalidateSession).toHaveBeenCalledTimes(1);
    });
  });

  describe("getStatus", () => {
    it("should report status of both sessions", () => {
      const status = orchestrator.getStatus();
      expect(status.openApi).toEqual({ hasSession: true, sessionIdPrefix: "open-api..." });
      expect(status.internalApi).toEqual({ hasSession: true, sessionIdPrefix: "internal..." });
    });

    it("should report internalApi as null when not configured", () => {
      const orchestratorNoInternal = new SessionOrchestrator(openApi, null);
      const status = orchestratorNoInternal.getStatus();
      expect(status.openApi).toBeTruthy();
      expect(status.internalApi).toBeNull();
    });
  });

  describe("hasInternalApi", () => {
    it("should return true when internal session is configured", () => {
      expect(orchestrator.hasInternalApi()).toBe(true);
    });

    it("should return false when internal session is null", () => {
      const orchestratorNoInternal = new SessionOrchestrator(openApi, null);
      expect(orchestratorNoInternal.hasInternalApi()).toBe(false);
    });
  });

  describe("independent error handling", () => {
    it("should not affect Open API when Internal API login fails", async () => {
      const failingInternal = mockInternalSession();
      (failingInternal.getSessionId as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Internal login failed"));

      const orch = new SessionOrchestrator(openApi, failingInternal);

      // Open API should still work
      const openSid = await orch.getOpenApiSessionId();
      expect(openSid).toBe("open-api-sid");

      // Internal API should throw independently
      await expect(orch.getInternalSessionId()).rejects.toThrow("Internal login failed");
    });

    it("should not affect Internal API when Open API login fails", async () => {
      const failingOpen = mockOpenApiSession();
      (failingOpen.getSessionId as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Open API login failed"));

      const orch = new SessionOrchestrator(failingOpen, internalApi);

      // Internal API should still work
      const internalSid = await orch.getInternalSessionId();
      expect(internalSid).toBe("internal-sid");

      // Open API should throw independently
      await expect(orch.getOpenApiSessionId()).rejects.toThrow("Open API login failed");
    });
  });
});
