import { describe, it, expect } from "vitest";
import {
  EcountApiError,
  SessionExpiredError,
  NetworkError,
  handleToolError,
} from "../../src/utils/error-handler.js";

describe("EcountApiError", () => {
  it("should store errorCode and message", () => {
    const error = new EcountApiError("E001", "Invalid parameter");
    expect(error.errorCode).toBe("E001");
    expect(error.message).toBe("Invalid parameter");
    expect(error.name).toBe("EcountApiError");
  });
});

describe("SessionExpiredError", () => {
  it("should have default message", () => {
    const error = new SessionExpiredError();
    expect(error.message).toBe("세션이 만료되었습니다");
    expect(error.name).toBe("SessionExpiredError");
  });

  it("should accept custom message", () => {
    const error = new SessionExpiredError("custom");
    expect(error.message).toBe("custom");
  });
});

describe("NetworkError", () => {
  it("should have default message", () => {
    const error = new NetworkError();
    expect(error.message).toBe("ECOUNT 서버에 연결할 수 없습니다");
    expect(error.name).toBe("NetworkError");
  });
});

describe("handleToolError", () => {
  it("should handle EcountApiError", () => {
    const error = new EcountApiError("E001", "Bad request");
    const result = handleToolError(error);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("ECOUNT 오류 [E001]: Bad request");
  });

  it("should handle NetworkError", () => {
    const error = new NetworkError("timeout");
    const result = handleToolError(error);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("연결 오류: timeout");
  });

  it("should handle generic Error", () => {
    const error = new Error("unexpected");
    const result = handleToolError(error);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("내부 오류: unexpected");
  });

  it("should handle non-Error values", () => {
    const result = handleToolError("string error");
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("알 수 없는 오류가 발생했습니다");
  });
});
