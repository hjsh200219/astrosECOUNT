import { describe, it, expect } from "vitest";
import { classifyIntoBuckets, type AgingEntry } from "../../src/utils/aging.js";

describe("classifyIntoBuckets", () => {
  const makeEntry = (dueDate: string, outstanding = 100): AgingEntry => ({
    dueDate,
    outstanding,
  });

  it("should classify current (not overdue)", () => {
    const asOf = new Date("2026-04-01");
    const result = classifyIntoBuckets([makeEntry("2026-04-15")], asOf);
    expect(result.current).toHaveLength(1);
    expect(result["1-30"]).toHaveLength(0);
  });

  it("should classify 1-30 days overdue", () => {
    const asOf = new Date("2026-04-15");
    const result = classifyIntoBuckets([makeEntry("2026-04-01")], asOf);
    expect(result["1-30"]).toHaveLength(1);
  });

  it("should classify 31-60 days overdue", () => {
    const asOf = new Date("2026-05-15");
    const result = classifyIntoBuckets([makeEntry("2026-04-01")], asOf);
    expect(result["31-60"]).toHaveLength(1);
  });

  it("should classify 61-90 days overdue", () => {
    const asOf = new Date("2026-06-15");
    const result = classifyIntoBuckets([makeEntry("2026-04-01")], asOf);
    expect(result["61-90"]).toHaveLength(1);
  });

  it("should classify 90+ days overdue", () => {
    const asOf = new Date("2026-07-15");
    const result = classifyIntoBuckets([makeEntry("2026-04-01")], asOf);
    expect(result["90+"]).toHaveLength(1);
  });

  it("should handle empty input", () => {
    const result = classifyIntoBuckets([], new Date());
    expect(result.current).toHaveLength(0);
    expect(result["90+"]).toHaveLength(0);
  });

  it("should distribute multiple entries across buckets", () => {
    const asOf = new Date("2026-06-01");
    const entries = [
      makeEntry("2026-07-01"), // current (future)
      makeEntry("2026-05-20"), // 1-30
      makeEntry("2026-04-15"), // 31-60
      makeEntry("2026-03-10"), // 61-90
      makeEntry("2026-01-01"), // 90+
    ];
    const result = classifyIntoBuckets(entries, asOf);
    expect(result.current).toHaveLength(1);
    expect(result["1-30"]).toHaveLength(1);
    expect(result["31-60"]).toHaveLength(1);
    expect(result["61-90"]).toHaveLength(1);
    expect(result["90+"]).toHaveLength(1);
  });
});
