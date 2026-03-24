import { SessionManager } from "./session-manager.js";
import { NetworkError, EcountApiError } from "../utils/error-handler.js";
import { logger } from "../utils/logger.js";
import { apiHostPrefix, type EcountConfig } from "../config.js";
import type { EcountResponse } from "./types.js";

export class EcountClient {
  private baseUrl: string;
  private hostUrl: string;
  public readonly sessionManager: SessionManager;

  constructor(config: EcountConfig) {
    this.hostUrl = `https://${apiHostPrefix(config)}${config.ECOUNT_ZONE}.ecount.com`;
    this.baseUrl = `${this.hostUrl}/OAPI/V2`;
    this.sessionManager = new SessionManager(config);
  }

  /** Raw POST to an absolute path (e.g. /ec5/api/...). Returns full JSON response. */
  async postRaw<T>(path: string, params: unknown): Promise<T> {
    const sessionId = await this.sessionManager.getSessionId();
    const url = `${this.hostUrl}${path}?session_Id=${encodeURIComponent(sessionId)}`;

    logger.debug("ECOUNT API 호출 (raw)", { path });
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
        `ECOUNT API 연결 실패 [${path}]: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const data = (await response.json()) as T;
    const duration = Date.now() - startTime;
    logger.info("ECOUNT API 응답 (raw)", { path, duration: `${duration}ms` });
    return data;
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

      if (Number(retryData.Status) !== 200 || retryData.Error) {
        throw this.extractError(retryData);
      }

      return retryData.Data;
    }

    // Normal error
    if (Number(data.Status) !== 200 || data.Error) {
      throw this.extractError(data);
    }

    return data.Data;
  }

  private extractError(data: EcountResponse<unknown>): EcountApiError {
    // V2 Error object: { Code, ErrorCode, Message }
    if (data.Error) {
      const code = data.Error.Code || data.Error.ErrorCode || "UNKNOWN";
      const msg = data.Error.Message || "API 호출 실패";
      const detail = data.Error.MessageDetail ? ` (${data.Error.MessageDetail})` : "";
      return new EcountApiError(String(code), `${msg}${detail}`);
    }
    // Top-level Errors array
    if (data.Errors && Array.isArray(data.Errors) && data.Errors.length > 0) {
      const first = data.Errors[0];
      const code = first.Code || first.ErrorCode || "UNKNOWN";
      const messages = data.Errors.map((e) => e.Message).join("; ");
      return new EcountApiError(String(code), messages);
    }
    return new EcountApiError("UNKNOWN", `API 오류 (Status: ${data.Status})`);
  }
}
