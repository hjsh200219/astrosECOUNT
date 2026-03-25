import { logger } from "../utils/logger.js";
import { NetworkError, EcountApiError } from "../utils/error-handler.js";
import type { InternalApiConfig } from "../config.js";
import type { EcountResponse } from "./types.js";

/** Session expiry error codes for internal API */
const SESSION_EXPIRED_CODES = ["SESSION_EXPIRED", "INVALID_SESSION", "-1"];

/** Default session TTL: 30 minutes */
const DEFAULT_SESSION_TTL_MS = 30 * 60 * 1000;

/**
 * Manages ECOUNT internal Web API sessions.
 *
 * Unlike the Open API (API_CERT_KEY-based, long-lived), the internal API
 * uses ec_req_sid cookies obtained via web login, which expire after ~30 min.
 */
export class InternalApiSession {
  private sessionId: string | null = null;
  private sessionAcquiredAt: number | null = null;
  private refreshPromise: Promise<string> | null = null;
  private readonly baseUrl: string;
  private readonly sessionTtlMs: number;

  constructor(
    private config: InternalApiConfig,
    options?: { sessionTtlMs?: number },
  ) {
    this.baseUrl = `https://oapi${config.ECOUNT_ZONE}.ecount.com`;
    this.sessionTtlMs = options?.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS;
  }

  async getSessionId(): Promise<string> {
    // Check if session exists and is still within TTL
    if (this.sessionId && !this.isExpiredByTtl()) {
      return this.sessionId;
    }

    // Auto-invalidate if TTL expired
    if (this.sessionId && this.isExpiredByTtl()) {
      logger.info("내부 API 세션 TTL 만료 — 자동 재로그인");
      this.sessionId = null;
      this.sessionAcquiredAt = null;
    }

    // Promise deduplication — prevents concurrent login() calls
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = this.login().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  async login(): Promise<string> {
    logger.info("ECOUNT 내부 API 로그인 시도...");

    const url = `${this.baseUrl}/Account/LogIn`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          COM_CODE: this.config.ECOUNT_COM_CODE,
          USER_ID: this.config.ECOUNT_WEB_ID,
          USER_PW: this.config.ECOUNT_WEB_PW,
          ZONE: this.config.ECOUNT_ZONE,
        }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      throw new NetworkError(
        `ECOUNT 내부 API 연결 실패: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const data = await response.json() as { Status: string; Data: { result: boolean; message?: string } };

    if (data.Status !== "200" || !data.Data?.result) {
      const msg = data.Data?.message ?? "로그인 실패";
      throw new EcountApiError("LOGIN_FAILED", `ECOUNT 내부 API 로그인 실패: ${msg}`);
    }

    // Extract ec_req_sid from Set-Cookie header
    const setCookie = response.headers.get("set-cookie") ?? "";
    const sidMatch = setCookie.match(/ec_req_sid=([^;]+)/);

    if (!sidMatch) {
      throw new EcountApiError("NO_SESSION", "ec_req_sid를 응답 헤더에서 찾을 수 없습니다");
    }

    this.sessionId = sidMatch[1];
    this.sessionAcquiredAt = Date.now();
    logger.info("ECOUNT 내부 API 로그인 성공", {
      sessionId: this.sessionId.substring(0, 8) + "...",
    });
    return this.sessionId;
  }

  isSessionExpired(response: EcountResponse<unknown>): boolean {
    if (!response.Error) return false;
    const code = response.Error.Code || response.Error.ErrorCode || "";
    return SESSION_EXPIRED_CODES.includes(code);
  }

  invalidateSession(): void {
    this.sessionId = null;
    this.sessionAcquiredAt = null;
    logger.info("내부 API 세션 무효화됨 — 다음 요청 시 자동 재로그인");
  }

  async forceRefresh(): Promise<string> {
    this.invalidateSession();
    return this.getSessionId();
  }

  getStatus(): { hasSession: boolean; sessionIdPrefix: string | null } {
    return {
      hasSession: this.sessionId !== null && !this.isExpiredByTtl(),
      sessionIdPrefix: this.sessionId ? this.sessionId.substring(0, 8) + "..." : null,
    };
  }

  private isExpiredByTtl(): boolean {
    if (!this.sessionAcquiredAt) return true;
    return Date.now() - this.sessionAcquiredAt >= this.sessionTtlMs;
  }
}
