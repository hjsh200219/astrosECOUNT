import { formatError, type McpResponse } from "./response-formatter.js";
import { logger } from "./logger.js";
import { CircuitBreakerOpen } from "../client/circuit-breaker.js";

export class EcountApiError extends Error {
  constructor(
    public readonly errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = "EcountApiError";
  }
}

export class SessionExpiredError extends Error {
  constructor(message = "세션이 만료되었습니다") {
    super(message);
    this.name = "SessionExpiredError";
  }
}

export class NetworkError extends Error {
  constructor(message = "ECOUNT 서버에 연결할 수 없습니다") {
    super(message);
    this.name = "NetworkError";
  }
}

export function handleToolError(error: unknown): McpResponse {
  if (error instanceof CircuitBreakerOpen) {
    return formatError("ECOUNT 내부 API가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해주세요.");
  }
  if (error instanceof EcountApiError) {
    return formatError(`ECOUNT 오류 [${error.errorCode}]: ${error.message}`);
  }
  if (error instanceof NetworkError) {
    return formatError(`연결 오류: ${error.message}`);
  }
  if (error instanceof Error) {
    logger.error("Unexpected error", { message: error.message, stack: error.stack });
    return formatError(`내부 오류: ${error.message}`);
  }
  logger.error("Unknown error", { error: String(error) });
  return formatError("알 수 없는 오류가 발생했습니다");
}
