import { SessionManager } from "./session-manager.js";
import { NetworkError, EcountApiError } from "../utils/error-handler.js";
import { logger } from "../utils/logger.js";
import type { EcountConfig } from "../config.js";
import type { EcountResponse } from "./types.js";

export class EcountClient {
  private baseUrl: string;
  public readonly sessionManager: SessionManager;

  constructor(config: EcountConfig) {
    this.baseUrl = `https://sboapi${config.ECOUNT_ZONE}.ecount.com/OAPI/V2`;
    this.sessionManager = new SessionManager(config);
  }

  async post<T>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> {
    const sessionId = await this.sessionManager.getSessionId();
    const url = `${this.baseUrl}/${endpoint}?SESSION_ID=${encodeURIComponent(sessionId)}`;

    logger.debug("ECOUNT API 호출", { endpoint, url: `${this.baseUrl}/${endpoint}` });
    const startTime = Date.now();

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      throw new NetworkError(
        `ECOUNT API 연결 실패 [${endpoint}]: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const data = (await response.json()) as EcountResponse<T>;
    const duration = Date.now() - startTime;
    logger.info("ECOUNT API 응답", { endpoint, status: data.Status, duration: `${duration}ms` });

    // Session expired → retry once
    if (this.sessionManager.isSessionExpiredError(data)) {
      logger.warn("세션 만료 감지 - 재로그인 후 재시도", { endpoint });
      this.sessionManager.invalidateSession();

      const newSessionId = await this.sessionManager.getSessionId();
      const retryUrl = `${this.baseUrl}/${endpoint}?SESSION_ID=${encodeURIComponent(newSessionId)}`;

      let retryResponse: Response;
      try {
        retryResponse = await fetch(retryUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
          signal: AbortSignal.timeout(30_000),
        });
      } catch (error) {
        throw new NetworkError(
          `ECOUNT API 재시도 실패 [${endpoint}]: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      const retryData = (await retryResponse.json()) as EcountResponse<T>;

      if (retryData.Status !== "200" || retryData.Error) {
        throw new EcountApiError(
          retryData.Error?.ErrorCode || "UNKNOWN",
          retryData.Error?.Message || "API 호출 실패"
        );
      }

      return retryData.Data;
    }

    // Normal error
    if (data.Status !== "200" || data.Error) {
      throw new EcountApiError(
        data.Error?.ErrorCode || "UNKNOWN",
        data.Error?.Message || "API 호출 실패"
      );
    }

    return data.Data;
  }
}
