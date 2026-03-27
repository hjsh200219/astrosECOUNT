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

import {
  validateContractShipmentCross,
  type ContractEntry,
  type ShipmentEntry,
} from "../../src/tools/inventory-verify.js";

describe("validateContractShipmentCross", () => {
  it("should return consistent result when contracts and shipments match", () => {
    const contracts: ContractEntry[] = [
      { contractId: "C001", blNumber: "BL-001", product: "돈육삼겹살", quantity: 100 },
    ];
    const shipments: ShipmentEntry[] = [
      { shipmentId: "S001", blNumber: "BL-001", product: "돈육삼겹살", quantity: 100, status: "입항" },
    ];
    const result = validateContractShipmentCross(contracts, shipments);
    expect(result.isConsistent).toBe(true);
    expect(result.unmatchedContracts).toHaveLength(0);
    expect(result.unmatchedShipments).toHaveLength(0);
    expect(result.quantityMismatches).toHaveLength(0);
  });

  it("should flag contract without blNumber as unmatched", () => {
    const contracts: ContractEntry[] = [
      { contractId: "C002", product: "소고기", quantity: 50 },
    ];
    const shipments: ShipmentEntry[] = [];
    const result = validateContractShipmentCross(contracts, shipments);
    expect(result.isConsistent).toBe(false);
    expect(result.unmatchedContracts).toHaveLength(1);
    expect(result.unmatchedContracts[0].contractId).toBe("C002");
    expect(result.unmatchedContracts[0].reason).toBe("BL번호 미지정");
  });

  it("should flag contract with blNumber not found in shipments", () => {
    const contracts: ContractEntry[] = [
      { contractId: "C003", blNumber: "BL-999", product: "닭고기", quantity: 30 },
    ];
    const shipments: ShipmentEntry[] = [];
    const result = validateContractShipmentCross(contracts, shipments);
    expect(result.isConsistent).toBe(false);
    expect(result.unmatchedContracts).toHaveLength(1);
    expect(result.unmatchedContracts[0].contractId).toBe("C003");
    expect(result.unmatchedContracts[0].reason).toBe("선적 데이터 없음");
  });

  it("should flag shipment with blNumber not found in contracts", () => {
    const contracts: ContractEntry[] = [];
    const shipments: ShipmentEntry[] = [
      { shipmentId: "S002", blNumber: "BL-888", product: "오리고기", quantity: 20, status: "통관" },
    ];
    const result = validateContractShipmentCross(contracts, shipments);
    expect(result.isConsistent).toBe(false);
    expect(result.unmatchedShipments).toHaveLength(1);
    expect(result.unmatchedShipments[0].shipmentId).toBe("S002");
    expect(result.unmatchedShipments[0].blNumber).toBe("BL-888");
    expect(result.unmatchedShipments[0].reason).toBe("계약 데이터 없음");
  });

  it("should detect quantity mismatch between matched contract and shipment", () => {
    const contracts: ContractEntry[] = [
      { contractId: "C004", blNumber: "BL-010", product: "수입소갈비", quantity: 200 },
    ];
    const shipments: ShipmentEntry[] = [
      { shipmentId: "S003", blNumber: "BL-010", product: "수입소갈비", quantity: 180, status: "입항" },
    ];
    const result = validateContractShipmentCross(contracts, shipments);
    expect(result.isConsistent).toBe(false);
    expect(result.quantityMismatches).toHaveLength(1);
    expect(result.quantityMismatches[0].blNumber).toBe("BL-010");
    expect(result.quantityMismatches[0].contractQty).toBe(200);
    expect(result.quantityMismatches[0].shipmentQty).toBe(180);
    expect(result.quantityMismatches[0].diff).toBe(20);
  });

  it("should return consistent result for empty inputs", () => {
    const result = validateContractShipmentCross([], []);
    expect(result.isConsistent).toBe(true);
    expect(result.unmatchedContracts).toHaveLength(0);
    expect(result.unmatchedShipments).toHaveLength(0);
    expect(result.quantityMismatches).toHaveLength(0);
  });

  it("should accumulate multiple mismatches correctly", () => {
    const contracts: ContractEntry[] = [
      { contractId: "C010", product: "A품목", quantity: 10 },
      { contractId: "C011", blNumber: "BL-100", product: "B품목", quantity: 50 },
      { contractId: "C012", blNumber: "BL-200", product: "C품목", quantity: 100 },
    ];
    const shipments: ShipmentEntry[] = [
      { shipmentId: "S010", blNumber: "BL-100", product: "B품목", quantity: 60, status: "입항" },
      { shipmentId: "S011", blNumber: "BL-300", product: "D품목", quantity: 40, status: "통관" },
    ];
    const result = validateContractShipmentCross(contracts, shipments);
    expect(result.isConsistent).toBe(false);
    // C010: no BL → unmatched contract (BL번호 미지정)
    expect(result.unmatchedContracts.some((u) => u.contractId === "C010" && u.reason === "BL번호 미지정")).toBe(true);
    // C012: BL-200 not in shipments → unmatched contract (선적 데이터 없음)
    expect(result.unmatchedContracts.some((u) => u.contractId === "C012" && u.reason === "선적 데이터 없음")).toBe(true);
    // S011: BL-300 not in contracts → unmatched shipment
    expect(result.unmatchedShipments.some((u) => u.shipmentId === "S011")).toBe(true);
    // BL-100: 50 vs 60 → quantity mismatch
    expect(result.quantityMismatches.some((m) => m.blNumber === "BL-100" && m.diff === 10)).toBe(true);
  });
});
