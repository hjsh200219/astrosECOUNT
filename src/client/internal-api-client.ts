import { logger } from "../utils/logger.js";
import { NetworkError, EcountApiError } from "../utils/error-handler.js";
import { KeyPackEncoder, KeyPackV2Decoder } from "./keypack.js";
import type { InternalApiSession } from "./internal-session.js";
import type { CircuitBreaker } from "./circuit-breaker.js";
import type { EcountResponse } from "./types.js";

/** Current KeyPack protocol version */
const KEYPACK_VERSION = "1.0.0";

/**
 * Client for ECOUNT's internal (non-public) Web API.
 *
 * Uses KeyPack encoding for request parameters and ec_req_sid cookies for auth.
 * All calls are routed through a CircuitBreaker for resilience.
 */
export class InternalApiClient {
  private readonly baseUrl: string;
  private readonly encoder = new KeyPackEncoder();
  private readonly v2Decoder = new KeyPackV2Decoder();

  constructor(
    private readonly session: InternalApiSession,
    private readonly circuitBreaker: CircuitBreaker,
    zone: string,
  ) {
    this.baseUrl = `https://oapi${zone}.ecount.com`;
  }

  /**
   * POST to an internal API endpoint with KeyPack-encoded parameters.
   *
   * - Encodes params via KeyPack
   * - Sends ec_req_sid as cookie
   * - Routes through CircuitBreaker
   * - Auto-retries once on session expiry
   */
  async post<T>(path: string, params: Record<string, unknown>): Promise<T> {
    return this.circuitBreaker.call(async () => {
      const result = await this.doPost<T>(path, params);

      // Check for session expiry — retry once with refreshed session
      if (this.session.isSessionExpired(result as unknown as EcountResponse<unknown>)) {
        logger.warn("내부 API 세션 만료 감지 — 재로그인 후 재시도", { path });
        await this.session.forceRefresh();
        const retryResult = await this.doPost<T>(path, params);

        const retryResponse = retryResult as unknown as EcountResponse<unknown>;
        if (Number(retryResponse.Status) !== 200 || retryResponse.Error) {
          throw this.extractError(retryResponse);
        }
        return this.decodeV2IfNeeded((retryResponse as EcountResponse<T>).Data);
      }

      const response = result as unknown as EcountResponse<unknown>;
      if (Number(response.Status) !== 200 || response.Error) {
        throw this.extractError(response);
      }

      return this.decodeV2IfNeeded((response as EcountResponse<T>).Data);
    });
  }

  private async doPost<T>(path: string, params: Record<string, unknown>): Promise<T> {
    const sessionId = await this.session.getSessionId();
    const encodedParams = this.encoder.encode(params);
    const url = `${this.baseUrl}${path}`;

    logger.debug("내부 API 호출", { path });
    const startTime = Date.now();

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": `ec_req_sid=${sessionId}`,
          "X-KeyPack-Version": KEYPACK_VERSION,
        },
        body: `__$KeyPack=${encodeURIComponent(encodedParams)}`,
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      throw new NetworkError(
        `ECOUNT 내부 API 연결 실패 [${path}]: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const data = (await response.json()) as T;
    const duration = Date.now() - startTime;
    logger.info("내부 API 응답", { path, duration: `${duration}ms` });
    return data;
  }

  /**
   * If data is a KeyPack V2 array, decode it into plain objects.
   * Otherwise return as-is.
   */
  private decodeV2IfNeeded<T>(data: T): T {
    if (this.v2Decoder.isKeyPackV2(data)) {
      return this.v2Decoder.decode(data as unknown as unknown[]) as unknown as T;
    }
    return data;
  }

  private extractError(data: EcountResponse<unknown>): EcountApiError {
    if (data.Error) {
      const code = data.Error.Code || data.Error.ErrorCode || "UNKNOWN";
      const msg = data.Error.Message || "내부 API 호출 실패";
      return new EcountApiError(String(code), msg);
    }
    return new EcountApiError("UNKNOWN", `내부 API 오류 (Status: ${data.Status})`);
  }
}
