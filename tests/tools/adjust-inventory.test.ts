import { describe, it, expect, beforeEach } from "vitest";
import {
  adjustInventory,
  listAdjustments,
  getAdjustmentHistory,
  type InventoryAdjustment,
} from "../../src/tools/adjust-inventory.js";

// In-memory store persists across tests; use unique product/warehouse combos per describe block

describe("adjustInventory", () => {
  it("should create an adjustment record with id, timestamp, and reason", () => {
    const adj = adjustInventory({
      product: "돈육 삼겹살",
      warehouse: "WH-001",
      quantityChange: 50,
      reason: "실재고 조정",
      adjustedBy: "admin",
    });
    expect(adj.id).toBeTruthy();
    expect(adj.product).toBe("돈육 삼겹살");
    expect(adj.warehouse).toBe("WH-001");
    expect(adj.quantityChange).toBe(50);
    expect(adj.reason).toBe("실재고 조정");
    expect(adj.adjustedBy).toBe("admin");
    expect(adj.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("should allow negative quantityChange for decrements", () => {
    const adj = adjustInventory({
      product: "닭가슴살",
      warehouse: "WH-002",
      quantityChange: -30,
      reason: "폐기 처리",
      adjustedBy: "manager",
    });
    expect(adj.quantityChange).toBe(-30);
  });

  it("should assign unique ids to different adjustments", () => {
    const a1 = adjustInventory({ product: "소고기", warehouse: "WH-003", quantityChange: 10, reason: "입고 조정", adjustedBy: "admin" });
    const a2 = adjustInventory({ product: "소고기", warehouse: "WH-003", quantityChange: 20, reason: "출고 조정", adjustedBy: "admin" });
    expect(a1.id).not.toBe(a2.id);
  });

  it("should throw if reason is empty string", () => {
    expect(() =>
      adjustInventory({
        product: "돈육",
        warehouse: "WH-004",
        quantityChange: 5,
        reason: "",
        adjustedBy: "admin",
      })
    ).toThrow();
  });

  it("should throw if quantityChange is zero", () => {
    expect(() =>
      adjustInventory({
        product: "돈육",
        warehouse: "WH-005",
        quantityChange: 0,
        reason: "이유 있음",
        adjustedBy: "admin",
      })
    ).toThrow();
  });
});

describe("listAdjustments", () => {
  it("should return all adjustments without filter", () => {
    const before = listAdjustments().length;
    adjustInventory({ product: "오리고기", warehouse: "WH-010", quantityChange: 15, reason: "수량 보정", adjustedBy: "staff" });
    const after = listAdjustments().length;
    expect(after).toBe(before + 1);
  });

  it("should filter by product", () => {
    adjustInventory({ product: "FILTER-PROD-A", warehouse: "WH-011", quantityChange: 5, reason: "조정", adjustedBy: "admin" });
    adjustInventory({ product: "FILTER-PROD-B", warehouse: "WH-011", quantityChange: 10, reason: "조정", adjustedBy: "admin" });
    const results = listAdjustments({ product: "FILTER-PROD-A" });
    expect(results.every((a) => a.product === "FILTER-PROD-A")).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("should filter by warehouse", () => {
    adjustInventory({ product: "닭고기", warehouse: "WH-FILTER-99", quantityChange: 7, reason: "조정", adjustedBy: "admin" });
    adjustInventory({ product: "소고기", warehouse: "WH-OTHER", quantityChange: 8, reason: "조정", adjustedBy: "admin" });
    const results = listAdjustments({ warehouse: "WH-FILTER-99" });
    expect(results.every((a) => a.warehouse === "WH-FILTER-99")).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("should filter by both product and warehouse", () => {
    adjustInventory({ product: "COMBO-PROD", warehouse: "COMBO-WH", quantityChange: 3, reason: "복합 필터 테스트", adjustedBy: "tester" });
    adjustInventory({ product: "COMBO-PROD", warehouse: "OTHER-WH", quantityChange: 4, reason: "다른 창고", adjustedBy: "tester" });
    const results = listAdjustments({ product: "COMBO-PROD", warehouse: "COMBO-WH" });
    expect(results.every((a) => a.product === "COMBO-PROD" && a.warehouse === "COMBO-WH")).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe("getAdjustmentHistory", () => {
  it("should return all adjustments for a specific product", () => {
    adjustInventory({ product: "HISTORY-PROD", warehouse: "WH-H01", quantityChange: 10, reason: "1차 조정", adjustedBy: "admin" });
    adjustInventory({ product: "HISTORY-PROD", warehouse: "WH-H02", quantityChange: -5, reason: "2차 조정", adjustedBy: "admin" });
    const history = getAdjustmentHistory("HISTORY-PROD");
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history.every((a) => a.product === "HISTORY-PROD")).toBe(true);
  });

  it("should return empty array for product with no adjustments", () => {
    const history = getAdjustmentHistory("NO-SUCH-PRODUCT-XYZ");
    expect(history).toEqual([]);
  });

  it("should accumulate multiple adjustments over time", () => {
    const product = "ACCUM-PROD";
    adjustInventory({ product, warehouse: "WH-A1", quantityChange: 100, reason: "초기 입고", adjustedBy: "admin" });
    adjustInventory({ product, warehouse: "WH-A1", quantityChange: -20, reason: "출고", adjustedBy: "admin" });
    adjustInventory({ product, warehouse: "WH-A1", quantityChange: 50, reason: "추가 입고", adjustedBy: "admin" });
    const history = getAdjustmentHistory(product);
    expect(history.length).toBeGreaterThanOrEqual(3);
  });
});

describe("registerAdjustInventoryTools", () => {
  it("should register tools without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerAdjustInventoryTools } = await import("../../src/tools/adjust-inventory.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerAdjustInventoryTools(server)).not.toThrow();
  });
});
