import { describe, it, expect } from "vitest";
import { calcWeightSettlement } from "../../src/tools/weight-settlement.js";

describe("calcWeightSettlement", () => {
  it("should return 잡이익 when actualWeight > contractWeight", () => {
    const result = calcWeightSettlement({
      shipmentId: "SHIP-W001",
      contractWeight: 1000,
      actualWeight: 1050,
      unitPrice: 5000,
      currency: "KRW",
    });

    expect(result.type).toBe("잡이익");
    expect(result.diff).toBe(50);
    expect(result.amount).toBe(250000); // 50 * 5000
    expect(result.shipmentId).toBe("SHIP-W001");
    expect(result.currency).toBe("KRW");
  });

  it("should return 잡손실 when actualWeight < contractWeight", () => {
    const result = calcWeightSettlement({
      shipmentId: "SHIP-W002",
      contractWeight: 1000,
      actualWeight: 980,
      unitPrice: 5000,
      currency: "USD",
    });

    expect(result.type).toBe("잡손실");
    expect(result.diff).toBe(-20);
    expect(result.amount).toBe(100000); // |−20| * 5000
  });

  it("should return 정상 when weights are equal", () => {
    const result = calcWeightSettlement({
      shipmentId: "SHIP-W003",
      contractWeight: 500,
      actualWeight: 500,
      unitPrice: 10000,
      currency: "KRW",
    });

    expect(result.type).toBe("정상");
    expect(result.diff).toBe(0);
    expect(result.amount).toBe(0);
  });

  it("should handle very small diff correctly", () => {
    const result = calcWeightSettlement({
      shipmentId: "SHIP-W004",
      contractWeight: 1000,
      actualWeight: 1000.5,
      unitPrice: 8000,
      currency: "USD",
    });

    expect(result.type).toBe("잡이익");
    expect(result.diff).toBeCloseTo(0.5);
    expect(result.amount).toBeCloseTo(4000); // 0.5 * 8000
  });

  it("should handle large numbers correctly", () => {
    const result = calcWeightSettlement({
      shipmentId: "SHIP-W005",
      contractWeight: 50000,
      actualWeight: 49500,
      unitPrice: 12000,
      currency: "KRW",
    });

    expect(result.type).toBe("잡손실");
    expect(result.diff).toBe(-500);
    expect(result.amount).toBe(6000000); // 500 * 12000
  });

  it("should always return a positive amount", () => {
    const loss = calcWeightSettlement({
      shipmentId: "SHIP-W006",
      contractWeight: 100,
      actualWeight: 90,
      unitPrice: 1000,
      currency: "KRW",
    });

    expect(loss.amount).toBeGreaterThanOrEqual(0);
  });
});

describe("registerWeightSettlementTools", () => {
  it("should register ecount_weight_calc_weight_settlement without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerWeightSettlementTools } = await import("../../src/tools/weight-settlement.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerWeightSettlementTools(server)).not.toThrow();
  });
});
