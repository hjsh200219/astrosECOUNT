import type { SessionManager } from "./session-manager.js";
import type { InternalApiSession } from "./internal-session.js";
import { logger } from "../utils/logger.js";

interface SessionStatus {
  hasSession: boolean;
  sessionIdPrefix: string | null;
}

/**
 * SessionOrchestrator — manages dual sessions for ECOUNT ERP.
 *
 * Open API session (SessionManager): API_CERT_KEY-based, long-lived.
 * Internal API session (InternalApiSession): ec_req_sid-based, ~30 min TTL.
 *
 * The two sessions have independent lifecycles and error handling.
 * A failure in one MUST NOT affect the other.
 */
export class SessionOrchestrator {
  constructor(
    private readonly openApiSession: SessionManager,
    private readonly internalApiSession: InternalApiSession | null,
  ) {
    logger.info("SessionOrchestrator 초기화", {
      hasOpenApi: true,
      hasInternalApi: internalApiSession !== null,
    });
  }

  /** Get Open API session ID (SESSION_ID for /OAPI/V2) */
  async getOpenApiSessionId(): Promise<string> {
    return this.openApiSession.getSessionId();
  }

  /** Get Internal API session ID (ec_req_sid). Returns null if not configured. */
  async getInternalSessionId(): Promise<string | null> {
    if (!this.internalApiSession) return null;
    return this.internalApiSession.getSessionId();
  }

  /** Invalidate only the Open API session */
  invalidateOpenApi(): void {
    this.openApiSession.invalidateSession();
  }

  /** Invalidate only the Internal API session */
  invalidateInternal(): void {
    this.internalApiSession?.invalidateSession();
  }

  /** Invalidate both sessions */
  invalidateAll(): void {
    this.openApiSession.invalidateSession();
    this.internalApiSession?.invalidateSession();
  }

  /** Check if internal API is configured */
  hasInternalApi(): boolean {
    return this.internalApiSession !== null;
  }

  /** Get status of both sessions */
  getStatus(): {
    openApi: SessionStatus;
    internalApi: SessionStatus | null;
  } {
    return {
      openApi: this.openApiSession.getStatus(),
      internalApi: this.internalApiSession?.getStatus() ?? null,
    };
  }
}
