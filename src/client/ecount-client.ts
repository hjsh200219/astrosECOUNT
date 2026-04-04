import { SessionManager } from "./session-manager.js";
import { NetworkError, EcountApiError } from "../utils/error-handler.js";
import { logger } from "../utils/logger.js";
import { apiHostPrefix, HTTP_TIMEOUT_MS, type EcountConfig } from "../config.js";
import type { EcountResponse } from "./types.js";

async function fetchJson<T>(url: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
  } catch (error) {
    const path = new URL(url).pathname;
    throw new NetworkError(
      `ECOUNT API 연결 실패 [${path}]: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return (await response.json()) as T;
}

function extractApiError(data: EcountResponse<unknown>): EcountApiError {
  if (data.Error) {
    const code = data.Error.Code || data.Error.ErrorCode || "UNKNOWN";
    const msg = data.Error.Message || "API 호출 실패";
    const detail = data.Error.MessageDetail ? ` (${data.Error.MessageDetail})` : "";
    return new EcountApiError(String(code), `${msg}${detail}`);
  }
  if (data.Errors && Array.isArray(data.Errors) && data.Errors.length > 0) {
    const first = data.Errors[0];
    const code = first.Code || first.ErrorCode || "UNKNOWN";
    const messages = data.Errors.map((e) => e.Message).join("; ");
    return new EcountApiError(String(code), messages);
  }
  return new EcountApiError("UNKNOWN", `API 오류 (Status: ${data.Status})`);
}

export class EcountClient {
  private baseUrl: string;
  private hostUrl: string;
  public readonly sessionManager: SessionManager;

  constructor(config: EcountConfig) {
    this.hostUrl = `https://${apiHostPrefix(config)}${config.ECOUNT_ZONE}.ecount.com`;
    this.baseUrl = `${this.hostUrl}/OAPI/V2`;
    this.sessionManager = new SessionManager(config);
  }

  async postRaw<T>(path: string, params: unknown): Promise<T> {
    const sessionId = await this.sessionManager.getSessionId();
    const url = `${this.hostUrl}${path}?session_Id=${encodeURIComponent(sessionId)}`;

    logger.debug("ECOUNT API 호출 (raw)", { path });
    const startTime = Date.now();
    const data = await fetchJson<T>(url, params);
    logger.info("ECOUNT API 응답 (raw)", { path, duration: `${Date.now() - startTime}ms` });
    return data;
  }

  async post<T>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> {
    const sessionId = await this.sessionManager.getSessionId();
    const url = `${this.baseUrl}/${endpoint}?SESSION_ID=${encodeURIComponent(sessionId)}`;

    logger.debug("ECOUNT API 호출", { endpoint, url: `${this.baseUrl}/${endpoint}` });
    const startTime = Date.now();
    const data = await fetchJson<EcountResponse<T>>(url, params);
    logger.info("ECOUNT API 응답", { endpoint, status: data.Status, duration: `${Date.now() - startTime}ms` });

    if (this.sessionManager.isSessionExpiredError(data)) {
      return this.retryAfterRelogin<T>(endpoint, params);
    }

    if (Number(data.Status) !== 200 || data.Error) {
      throw extractApiError(data);
    }
    return data.Data;
  }

  private async retryAfterRelogin<T>(endpoint: string, params: Record<string, unknown>): Promise<T> {
    logger.warn("세션 만료 감지 - 재로그인 후 재시도", { endpoint });
    this.sessionManager.invalidateSession();

    const newSessionId = await this.sessionManager.getSessionId();
    const retryUrl = `${this.baseUrl}/${endpoint}?SESSION_ID=${encodeURIComponent(newSessionId)}`;
    const retryData = await fetchJson<EcountResponse<T>>(retryUrl, params);

    if (Number(retryData.Status) !== 200 || retryData.Error) {
      throw extractApiError(retryData);
    }
    return retryData.Data;
  }
}
