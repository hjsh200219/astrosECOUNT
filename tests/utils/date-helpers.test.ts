import { describe, it, expect } from "vitest";
import { nowIso, today, daysSince } from "../../src/utils/date-helpers.js";

describe("nowIso", () => {
  it("should return a valid ISO 8601 string", () => {
    const result = nowIso();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("should return current time within 1 second", () => {
    const before = Date.now();
    const result = new Date(nowIso()).getTime();
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });
});

describe("today", () => {
  it("should return YYYY-MM-DD format", () => {
    const result = today();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("should match current date", () => {
    const expected = new Date().toISOString().slice(0, 10);
    expect(today()).toBe(expected);
  });
});

describe("daysSince", () => {
  it("should return 0 for today's date", () => {
    const todayIso = new Date().toISOString();
    expect(daysSince(todayIso)).toBe(0);
  });

  it("should return positive number for past dates", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(daysSince(threeDaysAgo)).toBe(3);
  });

  it("should handle date-only strings", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    expect(daysSince(twoDaysAgo)).toBeGreaterThanOrEqual(1);
    expect(daysSince(twoDaysAgo)).toBeLessThanOrEqual(3);
  });
});
