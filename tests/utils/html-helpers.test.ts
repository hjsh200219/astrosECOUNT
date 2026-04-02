import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  formatNumber,
  formatValue,
  defaultTitle,
} from "../../src/utils/html-helpers.js";

describe("escapeHtml", () => {
  it("should escape & < > and quotes", () => {
    expect(escapeHtml('a & b < c > d "e"')).toBe(
      "a &amp; b &lt; c &gt; d &quot;e&quot;",
    );
  });

  it("should return plain string unchanged", () => {
    expect(escapeHtml("hello")).toBe("hello");
  });
});

describe("formatNumber", () => {
  it("should format number with locale separators", () => {
    const result = formatNumber(1234567);
    expect(result).toMatch(/1.*234.*567/);
  });

  it("should return string for non-number", () => {
    expect(formatNumber("abc")).toBe("abc");
    expect(formatNumber(null)).toBe("");
    expect(formatNumber(undefined)).toBe("");
  });

  it("should return string for NaN", () => {
    expect(formatNumber(NaN)).toBe("NaN");
  });
});

describe("formatValue", () => {
  it("should return empty string for null/undefined", () => {
    expect(formatValue(null)).toBe("");
    expect(formatValue(undefined)).toBe("");
  });

  it("should JSON stringify objects", () => {
    expect(formatValue({ a: 1 })).toBe('{"a":1}');
  });

  it("should format numbers", () => {
    const result = formatValue(42);
    expect(result).toContain("42");
  });

  it("should convert strings directly", () => {
    expect(formatValue("test")).toBe("test");
  });
});

describe("defaultTitle", () => {
  it("should return Korean title for known types", () => {
    expect(defaultTitle("financial_summary", "ko")).toBe("재무 요약");
    expect(defaultTitle("aging_report", "ko")).toBe("채권 연령 분석");
  });

  it("should return English title for known types", () => {
    expect(defaultTitle("financial_summary", "en")).toBe("Financial Summary");
  });

  it("should return fallback for unknown types", () => {
    expect(defaultTitle("unknown_type", "ko")).toBe("대시보드");
    expect(defaultTitle("unknown_type", "en")).toBe("Dashboard");
  });
});
