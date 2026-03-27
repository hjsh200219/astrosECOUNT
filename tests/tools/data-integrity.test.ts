import { describe, it, expect } from "vitest";
import {
  validateContractShipmentMatch,
  validateInventoryConsistency,
  validateCustomsCostGap,
  validateAll,
  type ContractRecord,
  type ShipmentRecord,
  type InventoryBalance,
  type CostRecord,
  type CheckResult,
  type IntegrityReport,
} from "../../src/tools/data-integrity.js";

// ─── validateContractShipmentMatch ──────────────────────────────────────────

describe("validateContractShipmentMatch", () => {
  it("should pass when every contract has a matching shipment by blNumber", () => {
    const contracts: ContractRecord[] = [
      { id: "C-001", blNumber: "BL-001", product: "돈육삼겹살" },
    ];
    const shipments: ShipmentRecord[] = [
      { id: "S-001", blNumber: "BL-001", product: "돈육삼겹살", status: "완료" },
    ];
    const result = validateContractShipmentMatch(contracts, shipments);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe("info");
    expect(result.details).toHaveLength(0);
  });

  it("should fail when a contract has no matching shipment", () => {
    const contracts: ContractRecord[] = [
      { id: "C-001", blNumber: "BL-001", product: "돈육삼겹살" },
      { id: "C-002", blNumber: "BL-999", product: "소고기" },
    ];
    const shipments: ShipmentRecord[] = [
      { id: "S-001", blNumber: "BL-001", product: "돈육삼겹살", status: "완료" },
    ];
    const result = validateContractShipmentMatch(contracts, shipments);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("error");
    expect(result.details.some((d) => d.includes("BL-999"))).toBe(true);
  });

  it("should fail when a shipment has no matching contract", () => {
    const contracts: ContractRecord[] = [
      { id: "C-001", blNumber: "BL-001", product: "돈육삼겹살" },
    ];
    const shipments: ShipmentRecord[] = [
      { id: "S-001", blNumber: "BL-001", product: "돈육삼겹살", status: "완료" },
      { id: "S-002", blNumber: "BL-999", product: "닭고기", status: "완료" },
    ];
    const result = validateContractShipmentMatch(contracts, shipments);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("error");
    expect(result.details.some((d) => d.includes("BL-999"))).toBe(true);
  });

  it("should pass with info severity when both inputs are empty", () => {
    const result = validateContractShipmentMatch([], []);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe("info");
  });

  it("should skip match check for contracts without blNumber", () => {
    const contracts: ContractRecord[] = [
      { id: "C-001", product: "돈육삼겹살" }, // no blNumber
    ];
    const shipments: ShipmentRecord[] = [];
    const result = validateContractShipmentMatch(contracts, shipments);
    // contracts without blNumber are ignored in matching
    expect(result.passed).toBe(true);
  });
});

// ─── validateInventoryConsistency ───────────────────────────────────────────

describe("validateInventoryConsistency", () => {
  it("should pass when opening balance matches prior closing for all products", () => {
    const opening: InventoryBalance[] = [
      { product: "돈육삼겹살", quantity: 100, period: "2024-02" },
    ];
    const priorClosing: InventoryBalance[] = [
      { product: "돈육삼겹살", quantity: 100, period: "2024-01" },
    ];
    const result = validateInventoryConsistency(opening, priorClosing);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe("info");
    expect(result.details).toHaveLength(0);
  });

  it("should fail when opening quantity does not match prior closing", () => {
    const opening: InventoryBalance[] = [
      { product: "돈육삼겹살", quantity: 120, period: "2024-02" },
    ];
    const priorClosing: InventoryBalance[] = [
      { product: "돈육삼겹살", quantity: 100, period: "2024-01" },
    ];
    const result = validateInventoryConsistency(opening, priorClosing);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("error");
    expect(result.details.some((d) => d.includes("돈육삼겹살"))).toBe(true);
  });

  it("should warn when opening has a product not present in prior closing", () => {
    const opening: InventoryBalance[] = [
      { product: "신규품목", quantity: 50, period: "2024-02" },
    ];
    const priorClosing: InventoryBalance[] = [];
    const result = validateInventoryConsistency(opening, priorClosing);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("warning");
    expect(result.details.some((d) => d.includes("신규품목"))).toBe(true);
  });

  it("should pass with info severity when both inputs are empty", () => {
    const result = validateInventoryConsistency([], []);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe("info");
  });
});

// ─── validateCustomsCostGap ─────────────────────────────────────────────────

describe("validateCustomsCostGap", () => {
  it("should pass when every cleared shipment has a cost record", () => {
    const shipments: ShipmentRecord[] = [
      { id: "S-001", blNumber: "BL-001", product: "돈육삼겹살", status: "통관완료" },
    ];
    const costRecords: CostRecord[] = [
      { shipmentId: "S-001", customsCost: 500000 },
    ];
    const result = validateCustomsCostGap(shipments, costRecords);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe("info");
    expect(result.details).toHaveLength(0);
  });

  it("should fail when a cleared shipment has no cost record", () => {
    const shipments: ShipmentRecord[] = [
      { id: "S-001", blNumber: "BL-001", product: "돈육삼겹살", status: "통관완료" },
      { id: "S-002", blNumber: "BL-002", product: "소고기", status: "통관완료" },
    ];
    const costRecords: CostRecord[] = [
      { shipmentId: "S-001", customsCost: 500000 },
    ];
    const result = validateCustomsCostGap(shipments, costRecords);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("error");
    expect(result.details.some((d) => d.includes("S-002"))).toBe(true);
  });

  it("should ignore shipments that have not cleared customs", () => {
    const shipments: ShipmentRecord[] = [
      { id: "S-001", blNumber: "BL-001", product: "돈육삼겹살", status: "운송중" },
    ];
    const costRecords: CostRecord[] = [];
    const result = validateCustomsCostGap(shipments, costRecords);
    expect(result.passed).toBe(true);
  });

  it("should pass with info severity when shipments are empty", () => {
    const result = validateCustomsCostGap([], []);
    expect(result.passed).toBe(true);
    expect(result.severity).toBe("info");
  });
});

// ─── validateAll ────────────────────────────────────────────────────────────

describe("validateAll", () => {
  it("should return overallPassed true when all checks pass", () => {
    const report = validateAll({
      contracts: [{ id: "C-001", blNumber: "BL-001", product: "돈육삼겹살" }],
      shipments: [{ id: "S-001", blNumber: "BL-001", product: "돈육삼겹살", status: "통관완료" }],
      openingInventory: [{ product: "돈육삼겹살", quantity: 100, period: "2024-02" }],
      priorClosing: [{ product: "돈육삼겹살", quantity: 100, period: "2024-01" }],
      costRecords: [{ shipmentId: "S-001", customsCost: 500000 }],
    });
    expect(report.overallPassed).toBe(true);
    expect(report.passCount).toBe(3);
    expect(report.failCount).toBe(0);
    expect(report.checks).toHaveLength(3);
    expect(typeof report.checkedAt).toBe("string");
  });

  it("should return overallPassed false when any check fails", () => {
    const report = validateAll({
      contracts: [{ id: "C-001", blNumber: "BL-MISSING", product: "소고기" }],
      shipments: [],
      openingInventory: [],
      priorClosing: [],
      costRecords: [],
    });
    expect(report.overallPassed).toBe(false);
    expect(report.failCount).toBeGreaterThan(0);
  });

  it("should count passCount and failCount correctly", () => {
    const report = validateAll({
      contracts: [],
      shipments: [],
      openingInventory: [],
      priorClosing: [],
      costRecords: [],
    });
    expect(report.passCount + report.failCount).toBe(report.checks.length);
    expect(report.overallPassed).toBe(true);
  });

  it("should include a checkedAt ISO timestamp", () => {
    const report = validateAll({
      contracts: [],
      shipments: [],
    });
    expect(() => new Date(report.checkedAt)).not.toThrow();
    expect(new Date(report.checkedAt).getTime()).not.toBeNaN();
  });

  it("should run all 3 checks and return them in the checks array", () => {
    const report = validateAll({
      contracts: [],
      shipments: [],
    });
    expect(report.checks).toHaveLength(3);
    const names = report.checks.map((c: CheckResult) => c.name);
    expect(names).toContain("contract-shipment-match");
    expect(names).toContain("inventory-consistency");
    expect(names).toContain("customs-cost-gap");
  });
});

// ─── Tool registration ───────────────────────────────────────────────────────

describe("registerDataIntegrityTools", () => {
  it("should register tool without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerDataIntegrityTools } = await import("../../src/tools/data-integrity.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerDataIntegrityTools(server)).not.toThrow();
  });
});
