import { describe, it, expect } from "vitest";
import {
  verifyInventory,
  type InventoryStage,
} from "../../src/tools/inventory-verify.js";

describe("verifyInventory", () => {
  it("should return consistent result when data is balanced across stages", () => {
    const stages: InventoryStage[] = [
      { stage: "미착", product: "돈육삼겹살", quantity: 100, warehouse: "WH-A" },
      { stage: "미통관", product: "돈육삼겹살", quantity: 50 },
      { stage: "상품", product: "돈육삼겹살", quantity: 30 },
    ];
    const result = verifyInventory(stages);
    expect(result.totalQuantity).toBe(180);
    expect(result.byStage["미착"]).toBe(100);
    expect(result.byStage["미통관"]).toBe(50);
    expect(result.byStage["상품"]).toBe(30);
    expect(result.isConsistent).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it("should flag discrepancy when quantity is negative", () => {
    const stages: InventoryStage[] = [
      { stage: "미착", product: "소고기", quantity: -5 },
    ];
    const result = verifyInventory(stages);
    expect(result.isConsistent).toBe(false);
    expect(result.discrepancies.length).toBeGreaterThan(0);
    const disc = result.discrepancies.find((d) => d.product === "소고기");
    expect(disc).toBeDefined();
    expect(disc!.issue).toContain("음수");
  });

  it("should flag discrepancy when quantity is zero", () => {
    const stages: InventoryStage[] = [
      { stage: "상품", product: "닭고기", quantity: 0 },
    ];
    const result = verifyInventory(stages);
    expect(result.isConsistent).toBe(false);
    const disc = result.discrepancies.find((d) => d.product === "닭고기");
    expect(disc).toBeDefined();
  });

  it("should flag discrepancy when product exists in 상품 stage but not in prior stages", () => {
    const stages: InventoryStage[] = [
      { stage: "상품", product: "수입소갈비", quantity: 20 },
    ];
    const result = verifyInventory(stages);
    expect(result.isConsistent).toBe(false);
    const disc = result.discrepancies.find((d) => d.product === "수입소갈비");
    expect(disc).toBeDefined();
    expect(disc!.issue).toContain("이전 단계");
  });

  it("should not flag 상품 product when it also appears in a prior stage", () => {
    const stages: InventoryStage[] = [
      { stage: "미통관", product: "돼지갈비", quantity: 10 },
      { stage: "상품", product: "돼지갈비", quantity: 5 },
    ];
    const result = verifyInventory(stages);
    // no discrepancy for 돼지갈비 regarding prior stage
    const priorStagedisc = result.discrepancies.find(
      (d) => d.product === "돼지갈비" && d.issue.includes("이전 단계")
    );
    expect(priorStagedisc).toBeUndefined();
  });

  it("should return zero totals and isConsistent true for empty input", () => {
    const result = verifyInventory([]);
    expect(result.totalQuantity).toBe(0);
    expect(result.byStage).toEqual({});
    expect(result.discrepancies).toHaveLength(0);
    expect(result.isConsistent).toBe(true);
  });

  it("should aggregate quantities per stage for multiple products", () => {
    const stages: InventoryStage[] = [
      { stage: "미착", product: "A", quantity: 10 },
      { stage: "미착", product: "B", quantity: 20 },
      { stage: "상품", product: "A", quantity: 5 },
    ];
    const result = verifyInventory(stages);
    expect(result.byStage["미착"]).toBe(30);
    expect(result.byStage["상품"]).toBe(5);
    expect(result.totalQuantity).toBe(35);
  });
});

describe("registerInventoryVerifyTools", () => {
  it("should register tools without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerInventoryVerifyTools } = await import("../../src/tools/inventory-verify.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerInventoryVerifyTools(server)).not.toThrow();
  });
});
