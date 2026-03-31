import { describe, it, expect, beforeEach } from "vitest";
import {
  analyzeMargin,
  marginContracts,
  marginSales,
} from "../../src/tools/margin-analysis.js";

beforeEach(() => {
  marginContracts.clear();
  marginSales.clear();
});

describe("analyzeMargin", () => {
  beforeEach(() => {
    // Setup contracts (cost side)
    marginContracts.set("C-M1", {
      contractId: "C-M1",
      product: "한우채끝",
      buyer: "바이어A",
      costAmount: 20000000,
      currency: "KRW",
      contractDate: "2026-01-15",
    });
    marginContracts.set("C-M2", {
      contractId: "C-M2",
      product: "호주산등심",
      buyer: "바이어B",
      costAmount: 15000000,
      currency: "KRW",
      contractDate: "2026-02-01",
    });
    marginContracts.set("C-M3", {
      contractId: "C-M3",
      product: "한우채끝",
      buyer: "바이어C",
      costAmount: 10000000,
      currency: "KRW",
      contractDate: "2026-02-15",
    });

    // Setup sales (revenue side)
    marginSales.set("S-M1", {
      salesId: "S-M1",
      contractId: "C-M1",
      product: "한우채끝",
      revenueAmount: 28000000,
      currency: "KRW",
      salesDate: "2026-02-20",
    });
    marginSales.set("S-M2", {
      salesId: "S-M2",
      contractId: "C-M2",
      product: "호주산등심",
      revenueAmount: 18000000,
      currency: "KRW",
      salesDate: "2026-03-01",
    });
    marginSales.set("S-M3", {
      salesId: "S-M3",
      contractId: "C-M3",
      product: "한우채끝",
      revenueAmount: 13000000,
      currency: "KRW",
      salesDate: "2026-03-10",
    });
  });

  it("should analyze margin grouped by contract", () => {
    const result = analyzeMargin({ groupBy: "contract" });

    expect(result.items.length).toBe(3);
    expect(result.groupBy).toBe("contract");

    const c1 = result.items.find((i: { contractId: string }) => i.contractId === "C-M1");
    expect(c1).toBeDefined();
    expect(c1.revenue).toBe(28000000);
    expect(c1.cost).toBe(20000000);
    expect(c1.margin).toBe(8000000);
    expect(c1.marginRate).toBeCloseTo(28.57, 1);
  });

  it("should analyze margin grouped by product", () => {
    const result = analyzeMargin({ groupBy: "product" });

    expect(result.groupBy).toBe("product");
    const hanwoo = result.items.find((i: { product: string }) => i.product === "한우채끝");
    expect(hanwoo).toBeDefined();
    // 한우채끝: revenue 28M+13M=41M, cost 20M+10M=30M, margin 11M
    expect(hanwoo.revenue).toBe(41000000);
    expect(hanwoo.cost).toBe(30000000);
    expect(hanwoo.margin).toBe(11000000);
  });

  it("should rank by profitability (descending margin)", () => {
    const result = analyzeMargin({ groupBy: "contract" });

    const margins = result.items.map((i: { margin: number }) => i.margin);
    for (let idx = 0; idx < margins.length - 1; idx++) {
      expect(margins[idx]).toBeGreaterThanOrEqual(margins[idx + 1]);
    }
  });

  it("should filter by period when specified", () => {
    const result = analyzeMargin({
      groupBy: "contract",
      periodFrom: "2026-03-01",
      periodTo: "2026-03-31",
    });

    // Only S-M2 (03-01) and S-M3 (03-10) fall in March
    expect(result.items.length).toBe(2);
  });

  it("should return summary totals", () => {
    const result = analyzeMargin({ groupBy: "contract" });

    expect(result.summary).toBeDefined();
    expect(result.summary.totalRevenue).toBe(59000000); // 28+18+13
    expect(result.summary.totalCost).toBe(45000000); // 20+15+10
    expect(result.summary.totalMargin).toBe(14000000);
  });

  it("should handle empty data gracefully", () => {
    marginContracts.clear();
    marginSales.clear();

    const result = analyzeMargin({ groupBy: "contract" });
    expect(result.items).toHaveLength(0);
    expect(result.summary.totalRevenue).toBe(0);
    expect(result.summary.totalCost).toBe(0);
    expect(result.summary.totalMargin).toBe(0);
  });
});

describe("registerMarginAnalysisTools", () => {
  it("should register ecount_analyze_margin without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerMarginAnalysisTools } = await import("../../src/tools/margin-analysis.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerMarginAnalysisTools(server)).not.toThrow();
  });
});
