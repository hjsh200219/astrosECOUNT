import { describe, it, expect, beforeEach } from "vitest";
import {
  addCostOverride,
  getCostOverride,
  calculateLandedCost,
  listCostOverrides,
  type AdditionalCost,
  type CostOverride,
  type LandedCostResult,
} from "../../src/tools/customs-cost.js";

// Reset in-memory storage before each test
beforeEach(async () => {
  // Re-import to get fresh module state isn't possible with ESM cache,
  // so we use listCostOverrides length checks or rely on unique shipmentIds per test.
});

describe("addCostOverride", () => {
  it("should store a cost override and return it with id and createdAt", () => {
    const result = addCostOverride({
      shipmentId: "SHIP-001",
      customsDuty: 500000,
      additionalCosts: [{ name: "운송비", amount: 100000 }],
      reason: "관세 수동 입력",
      overriddenBy: "user1",
    });

    expect(result.id).toBeDefined();
    expect(result.id.length).toBeGreaterThan(0);
    expect(result.shipmentId).toBe("SHIP-001");
    expect(result.customsDuty).toBe(500000);
    expect(result.additionalCosts).toHaveLength(1);
    expect(result.additionalCosts[0].name).toBe("운송비");
    expect(result.additionalCosts[0].amount).toBe(100000);
    expect(result.reason).toBe("관세 수동 입력");
    expect(result.overriddenBy).toBe("user1");
    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("should assign unique ids for different overrides", () => {
    const a = addCostOverride({
      shipmentId: "SHIP-A1",
      customsDuty: 100000,
      additionalCosts: [],
      reason: "test",
      overriddenBy: "user",
    });
    const b = addCostOverride({
      shipmentId: "SHIP-B1",
      customsDuty: 200000,
      additionalCosts: [],
      reason: "test",
      overriddenBy: "user",
    });
    expect(a.id).not.toBe(b.id);
  });
});

describe("getCostOverride", () => {
  it("should retrieve the override for a stored shipmentId", () => {
    addCostOverride({
      shipmentId: "SHIP-GET-001",
      customsDuty: 300000,
      additionalCosts: [{ name: "보험료", amount: 50000 }],
      reason: "수정",
      overriddenBy: "admin",
    });

    const result = getCostOverride("SHIP-GET-001");
    expect(result).not.toBeNull();
    expect(result!.shipmentId).toBe("SHIP-GET-001");
    expect(result!.customsDuty).toBe(300000);
  });

  it("should return null for non-existent shipmentId", () => {
    const result = getCostOverride("SHIP-DOES-NOT-EXIST");
    expect(result).toBeNull();
  });
});

describe("calculateLandedCost", () => {
  it("should calculate landed cost correctly", () => {
    addCostOverride({
      shipmentId: "SHIP-CALC-001",
      customsDuty: 500000,
      additionalCosts: [
        { name: "운송비", amount: 100000 },
        { name: "하역비", amount: 50000 },
      ],
      reason: "landed cost 계산 테스트",
      overriddenBy: "user",
    });

    const result = calculateLandedCost("SHIP-CALC-001", 1000, 1350);
    // landedCost = 1000 * 1350 + 500000 + 100000 + 50000 = 2000000
    expect(result).not.toBeNull();
    expect(result!.shipmentId).toBe("SHIP-CALC-001");
    expect(result!.basePrice).toBe(1000);
    expect(result!.exchangeRate).toBe(1350);
    expect(result!.basePriceKrw).toBe(1000 * 1350);
    expect(result!.customsDuty).toBe(500000);
    expect(result!.additionalCostsTotal).toBe(150000);
    expect(result!.additionalCostsBreakdown).toHaveLength(2);
    expect(result!.landedCost).toBe(1000 * 1350 + 500000 + 100000 + 50000);
  });

  it("should accumulate multiple additionalCosts correctly", () => {
    addCostOverride({
      shipmentId: "SHIP-MULTI-001",
      customsDuty: 0,
      additionalCosts: [
        { name: "운송비", amount: 100000 },
        { name: "보험료", amount: 20000 },
        { name: "하역비", amount: 30000 },
        { name: "검사비", amount: 10000 },
      ],
      reason: "다중 비용 항목 테스트",
      overriddenBy: "user",
    });

    const result = calculateLandedCost("SHIP-MULTI-001", 500, 1400);
    expect(result!.additionalCostsTotal).toBe(160000); // 100000+20000+30000+10000
    expect(result!.landedCost).toBe(500 * 1400 + 0 + 160000);
  });

  it("should return null for non-existent shipmentId", () => {
    const result = calculateLandedCost("SHIP-MISSING", 1000, 1350);
    expect(result).toBeNull();
  });
});

describe("listCostOverrides", () => {
  it("should return all stored overrides as an array", () => {
    addCostOverride({
      shipmentId: "SHIP-LIST-001",
      customsDuty: 100000,
      additionalCosts: [],
      reason: "test",
      overriddenBy: "user",
    });
    addCostOverride({
      shipmentId: "SHIP-LIST-002",
      customsDuty: 200000,
      additionalCosts: [],
      reason: "test",
      overriddenBy: "user",
    });

    const all = listCostOverrides();
    expect(Array.isArray(all)).toBe(true);
    const ids = all.map((o) => o.shipmentId);
    expect(ids).toContain("SHIP-LIST-001");
    expect(ids).toContain("SHIP-LIST-002");
  });
});

describe("registerCustomsCostTools", () => {
  it("should register ecount_customs_override_customs_cost and ecount_customs_get_landed_cost without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerCustomsCostTools } = await import("../../src/tools/customs-cost.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerCustomsCostTools(server)).not.toThrow();
  });
});
