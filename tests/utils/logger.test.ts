import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "../../src/utils/logger.js";

describe("logger", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it("should write info messages to stderr", () => {
    logger.info("test message");
    expect(stderrSpy).toHaveBeenCalled();
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain("[INFO]");
    expect(output).toContain("test message");
  });

  it("should write error messages to stderr", () => {
    logger.error("error occurred");
    expect(stderrSpy).toHaveBeenCalled();
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain("[ERROR]");
    expect(output).toContain("error occurred");
  });

  it("should write warn messages to stderr", () => {
    logger.warn("warning");
    expect(stderrSpy).toHaveBeenCalled();
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain("[WARN]");
    expect(output).toContain("warning");
  });

  it("should include ISO timestamp", () => {
    logger.info("timestamped");
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
  });

  it("should include meta as JSON when provided", () => {
    logger.info("with meta", { key: "value" });
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('{"key":"value"}');
  });

  it("should append newline", () => {
    logger.info("newline test");
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output.endsWith("\n")).toBe(true);
  });
});
