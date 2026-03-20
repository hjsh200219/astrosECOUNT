import { logger } from "../utils/logger.js";
import { NetworkError, EcountApiError } from "../utils/error-handler.js";
import type { EcountConfig } from "../config.js";
import type { EcountResponse, SessionInfo } from "./types.js";

// Session expiry error codes (to be confirmed in Phase 2.5)
const SESSION_EXPIRED_CODES = ["SESSION_EXPIRED", "INVALID_SESSION", "-1"];

export class SessionManager {
  private sessionId: string | null = null;
  private refreshPromise: Promise<string> | null = null;
  private baseUrl: string;

  constructor(private config: EcountConfig) {
    this.baseUrl = `https://oapi${config.ECOUNT_ZONE}.ecount.com`;
  }

  async getSessionId(): Promise<string> {
    if (this.sessionId) return this.sessionId;

    // Promise deduplication - prevents concurrent login() calls
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = this.login().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  async login(): Promise<string> {
    logger.info("ECOUNT 세션 로그인 시도...");

    const url = `${this.baseUrl}/OAPI/V2/OAPIAccessToken/GetAccessToken`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          COM_CODE: this.config.ECOUNT_COM_CODE,
          USER_ID: this.config.ECOUNT_USER_ID,
          API_CERT_KEY: this.config.ECOUNT_API_CERT_KEY,
          LAN_TYPE: this.config.ECOUNT_LAN_TYPE,
          ZONE: this.config.ECOUNT_ZONE,
        }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      throw new NetworkError(
        `ECOUNT 서버 연결 실패: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const data = (await response.json()) as EcountResponse<SessionInfo>;

    if (data.Status !== "200" || data.Error) {
      const errorMsg = data.Error?.Message || "로그인 실패";
      const errorCode = data.Error?.ErrorCode || "UNKNOWN";
      throw new EcountApiError(errorCode, errorMsg);
    }

    this.sessionId = data.Data.SESSION_ID;
    logger.info("ECOUNT 세션 로그인 성공", { sessionId: this.sessionId.substring(0, 8) + "..." });
    return this.sessionId;
  }

  isSessionExpiredError(response: EcountResponse<unknown>): boolean {
    if (!response.Error) return false;
    return SESSION_EXPIRED_CODES.includes(response.Error.ErrorCode);
  }

  invalidateSession(): void {
    this.sessionId = null;
    logger.info("세션 무효화됨 - 다음 요청 시 자동 재로그인");
  }

  async forceRefresh(): Promise<string> {
    this.invalidateSession();
    return this.getSessionId();
  }

  getStatus(): { hasSession: boolean; sessionIdPrefix: string | null } {
    return {
      hasSession: this.sessionId !== null,
      sessionIdPrefix: this.sessionId ? this.sessionId.substring(0, 8) + "..." : null,
    };
  }
}
