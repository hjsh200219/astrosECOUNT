import { describe, it, expect, beforeEach } from "vitest";
import {
  trackInventoryStage,
  getInventoryPipeline,
  transitions,
  STAGES,
} from "../../src/tools/inventory-lifecycle.js";

beforeEach(() => {
  transitions.clear();
});

describe("STAGES", () => {
  it("should define 5 stages in correct order", () => {
    expect(STAGES).toEqual(["계약", "미착", "도착", "상품", "판매완료"]);
  });
});

describe("trackInventoryStage", () => {
  it("should record a valid stage transition", () => {
    const result = trackInventoryStage({
      shipmentId: "SHIP-001",
      product: "한우채끝",
      fromStage: "계약",
      toStage: "미착",
      quantity: 500,
    });

    expect(result.id).toBeDefined();
    expect(result.shipmentId).toBe("SHIP-001");
    expect(result.product).toBe("한우채끝");
    expect(result.fromStage).toBe("계약");
    expect(result.toStage).toBe("미착");
    expect(result.quantity).toBe(500);
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("should accept optional warehouse parameter", () => {
    const result = trackInventoryStage({
      shipmentId: "SHIP-002",
      product: "호주산등심",
      fromStage: "도착",
      toStage: "상품",
      quantity: 300,
      warehouse: "인천냉동창고",
    });

    expect(result.warehouse).toBe("인천냉동창고");
  });

  it("should reject invalid stage skip (계약 → 도착)", () => {
    expect(() =>
      trackInventoryStage({
        shipmentId: "SHIP-003",
        product: "미국산갈비",
        fromStage: "계약",
        toStage: "도착",
        quantity: 100,
      })
    ).toThrow();
  });

  it("should reject backward transition (상품 → 미착)", () => {
    expect(() =>
      trackInventoryStage({
        shipmentId: "SHIP-004",
        product: "캐나다산목심",
        fromStage: "상품",
        toStage: "미착",
        quantity: 200,
      })
    ).toThrow();
  });

  it("should reject same stage transition (미착 → 미착)", () => {
    expect(() =>
      trackInventoryStage({
        shipmentId: "SHIP-005",
        product: "뉴질랜드양고기",
        fromStage: "미착",
        toStage: "미착",
        quantity: 150,
      })
    ).toThrow();
  });

  it("should store multiple transitions", () => {
    trackInventoryStage({ shipmentId: "SHIP-006", product: "한우채끝", fromStage: "계약", toStage: "미착", quantity: 500 });
    trackInventoryStage({ shipmentId: "SHIP-006", product: "한우채끝", fromStage: "미착", toStage: "도착", quantity: 500 });

    expect(transitions.size).toBe(2);
  });
});

describe("getInventoryPipeline", () => {
  beforeEach(() => {
    trackInventoryStage({ shipmentId: "S-A", product: "한우채끝", fromStage: "계약", toStage: "미착", quantity: 500 });
    trackInventoryStage({ shipmentId: "S-B", product: "호주산등심", fromStage: "계약", toStage: "미착", quantity: 300 });
    trackInventoryStage({ shipmentId: "S-A", product: "한우채끝", fromStage: "미착", toStage: "도착", quantity: 500 });
    trackInventoryStage({ shipmentId: "S-C", product: "한우채끝", fromStage: "계약", toStage: "미착", quantity: 200 });
  });

  it("should return pipeline view with all stages", () => {
    const result = getInventoryPipeline({});

    expect(result.pipeline).toBeDefined();
    expect(Array.isArray(result.pipeline)).toBe(true);
    expect(result.totalItems).toBeGreaterThan(0);
  });

  it("should filter by product", () => {
    const result = getInventoryPipeline({ product: "한우채끝" });

    const products = result.pipeline.map((p: { product: string }) => p.product);
    expect(products.every((p: string) => p === "한우채끝")).toBe(true);
  });

  it("should filter by stage", () => {
    const result = getInventoryPipeline({ stage: "미착" });

    const stages = result.pipeline.map((p: { currentStage: string }) => p.currentStage);
    expect(stages.every((s: string) => s === "미착")).toBe(true);
  });

  it("should show latest stage for each shipment+product", () => {
    // S-A went 계약→미착→도착, so current stage should be 도착
    const result = getInventoryPipeline({ product: "한우채끝" });
    const sA = result.pipeline.find((p: { shipmentId: string }) => p.shipmentId === "S-A");
    expect(sA.currentStage).toBe("도착");
  });

  it("should return empty pipeline when no data matches", () => {
    const result = getInventoryPipeline({ product: "존재하지않는품목" });
    expect(result.pipeline).toHaveLength(0);
    expect(result.totalItems).toBe(0);
  });
});

describe("registerInventoryLifecycleTools", () => {
  it("should register both tools without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerInventoryLifecycleTools } = await import("../../src/tools/inventory-lifecycle.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerInventoryLifecycleTools(server)).not.toThrow();
  });
});
