import { describe, it, expect } from "vitest";
import { formatResponse, formatError } from "../../src/utils/response-formatter.js";

describe("formatResponse", () => {
  it("should format string data as text content", () => {
    const result = formatResponse("hello");
    expect(result).toEqual({
      content: [{ type: "text", text: "hello" }],
    });
  });

  it("should format object data as JSON string", () => {
    const result = formatResponse({ key: "value" });
    expect(result.content[0].text).toContain('"key": "value"');
  });

  it("should format array data as JSON string", () => {
    const result = formatResponse([1, 2, 3]);
    expect(result.content[0].text).toBe("[\n  1,\n  2,\n  3\n]");
  });

  it("should not set isError flag", () => {
    const result = formatResponse("ok");
    expect(result.isError).toBeUndefined();
  });
});

describe("formatError", () => {
  it("should format error message with isError flag", () => {
    const result = formatError("something failed");
    expect(result).toEqual({
      content: [{ type: "text", text: "something failed" }],
      isError: true,
    });
  });
});
