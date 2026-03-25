import { describe, it, expect } from "vitest";
import {
  getCustomsBroker,
  getWarehouseMapping,
  listBusinessRules,
  type BusinessRule,
} from "../../src/tools/business-rules.js";

describe("getCustomsBroker", () => {
  it("should assign 원스탑 for 전지벌크", () => {
    const result = getCustomsBroker("전지벌크");
    expect(result.broker).toBe("원스탑관세법인");
    expect(result.contact).toBeDefined();
  });

  it("should assign 정운 as default broker", () => {
    const result = getCustomsBroker("일반품목");
    expect(result.broker).toBe("정운관세법인");
  });

  it("should assign 정운 for 돈육", () => {
    const result = getCustomsBroker("돈육 목살");
    expect(result.broker).toBe("정운관세법인");
  });
});

describe("getWarehouseMapping", () => {
  it("should return 3-stage warehouse info", () => {
    const result = getWarehouseMapping();
    expect(result.stages).toHaveLength(3);
    expect(result.stages.map((s) => s.stage)).toEqual(["미착", "미통관", "상품"]);
  });

  it("should have warehouse codes for each stage", () => {
    const result = getWarehouseMapping();
    for (const stage of result.stages) {
      expect(stage.warehouses.length).toBeGreaterThanOrEqual(1);
      for (const wh of stage.warehouses) {
        expect(wh.code).toBeDefined();
        expect(wh.name).toBeDefined();
      }
    }
  });
});

describe("listBusinessRules", () => {
  it("should return all rules", () => {
    const rules = listBusinessRules();
    expect(rules.length).toBeGreaterThanOrEqual(2);
  });

  it("should filter by category", () => {
    const rules = listBusinessRules("customs");
    expect(rules.every((r) => r.category === "customs")).toBe(true);
  });
});

describe("registerBusinessRuleTools", () => {
  it("should register business rule tools without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerBusinessRuleTools } = await import("../../src/tools/business-rules.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerBusinessRuleTools(server)).not.toThrow();
  });
});
