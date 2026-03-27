import { describe, it, expect } from "vitest";
import {
  checkDocuments,
  findOverdueDeliveries,
  findOverdueCustomsClearance,
  generateProcessReport,
  type ShipmentDoc,
  type SaleRecord,
} from "../../src/tools/document-status.js";

// ─── helpers ───────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function makeShipment(overrides: Partial<ShipmentDoc> & { shipmentId: string }): ShipmentDoc {
  return {
    blNumber: "BL-TEST-001",
    documents: [],
    status: "in_transit",
    ...overrides,
  };
}

function makeSale(overrides: Partial<SaleRecord> & { id: string }): SaleRecord {
  return {
    product: "돈육삼겹살",
    customer: "테스트고객",
    saleDate: daysAgo(5),
    delivered: false,
    ...overrides,
  };
}

const DEFAULT_DOCS = ["B/L", "Invoice", "Packing List", "Certificate of Origin", "Health Certificate"];

// ─── checkDocuments ─────────────────────────────────────────────────────────

describe("checkDocuments", () => {
  it("should return empty array for empty shipments", () => {
    const result = checkDocuments([], DEFAULT_DOCS);
    expect(result).toHaveLength(0);
  });

  it("should detect all missing documents when shipment has none", () => {
    const shipments = [makeShipment({ shipmentId: "SHP-001", documents: [] })];
    const result = checkDocuments(shipments, DEFAULT_DOCS);
    expect(result).toHaveLength(1);
    expect(result[0].shipmentId).toBe("SHP-001");
    expect(result[0].missingDocuments).toEqual(DEFAULT_DOCS);
    expect(result[0].completionRate).toBe(0);
  });

  it("should detect no missing documents when all are present", () => {
    const shipments = [makeShipment({ shipmentId: "SHP-002", documents: [...DEFAULT_DOCS] })];
    const result = checkDocuments(shipments, DEFAULT_DOCS);
    expect(result).toHaveLength(1);
    expect(result[0].missingDocuments).toHaveLength(0);
    expect(result[0].completionRate).toBe(1);
  });

  it("should detect partial missing documents", () => {
    const shipments = [
      makeShipment({ shipmentId: "SHP-003", documents: ["B/L", "Invoice"] }),
    ];
    const result = checkDocuments(shipments, DEFAULT_DOCS);
    expect(result[0].missingDocuments).toEqual(["Packing List", "Certificate of Origin", "Health Certificate"]);
    expect(result[0].completionRate).toBeCloseTo(2 / 5);
  });

  it("should use default required docs when none provided", () => {
    const shipments = [makeShipment({ shipmentId: "SHP-004", documents: [] })];
    const result = checkDocuments(shipments);
    expect(result[0].missingDocuments).toEqual(DEFAULT_DOCS);
  });

  it("should handle multiple shipments", () => {
    const shipments = [
      makeShipment({ shipmentId: "SHP-A", documents: [...DEFAULT_DOCS] }),
      makeShipment({ shipmentId: "SHP-B", documents: [] }),
    ];
    const result = checkDocuments(shipments, DEFAULT_DOCS);
    expect(result).toHaveLength(2);
    expect(result[0].completionRate).toBe(1);
    expect(result[1].completionRate).toBe(0);
  });

  it("should include blNumber in result", () => {
    const shipments = [makeShipment({ shipmentId: "SHP-BL", blNumber: "BL-999", documents: [] })];
    const result = checkDocuments(shipments, DEFAULT_DOCS);
    expect(result[0].blNumber).toBe("BL-999");
  });
});

// ─── findOverdueDeliveries ───────────────────────────────────────────────────

describe("findOverdueDeliveries", () => {
  it("should return empty array for empty sales", () => {
    const result = findOverdueDeliveries([], 3);
    expect(result).toHaveLength(0);
  });

  it("should detect overdue undelivered sale past maxDays", () => {
    const sales = [makeSale({ id: "SALE-001", saleDate: daysAgo(5), delivered: false })];
    const result = findOverdueDeliveries(sales, 3);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("SALE-001");
    expect(result[0].type).toBe("delivery");
    expect(result[0].daysPending).toBeGreaterThanOrEqual(5);
  });

  it("should not flag delivered sales", () => {
    const sales = [makeSale({ id: "SALE-002", saleDate: daysAgo(10), delivered: true })];
    const result = findOverdueDeliveries(sales, 3);
    expect(result).toHaveLength(0);
  });

  it("should not flag sale within maxDays", () => {
    const sales = [makeSale({ id: "SALE-003", saleDate: daysAgo(2), delivered: false })];
    const result = findOverdueDeliveries(sales, 3);
    expect(result).toHaveLength(0);
  });

  it("should use default maxDays of 3 when not provided", () => {
    const overdue = [makeSale({ id: "SALE-D4", saleDate: daysAgo(4), delivered: false })];
    const fresh = [makeSale({ id: "SALE-D1", saleDate: daysAgo(1), delivered: false })];
    expect(findOverdueDeliveries(overdue)).toHaveLength(1);
    expect(findOverdueDeliveries(fresh)).toHaveLength(0);
  });

  it("should include detail string in result", () => {
    const sales = [makeSale({ id: "SALE-DT", product: "소갈비", customer: "서울식품", saleDate: daysAgo(5), delivered: false })];
    const result = findOverdueDeliveries(sales, 3);
    expect(result[0].detail).toBeTruthy();
    expect(typeof result[0].detail).toBe("string");
  });
});

// ─── findOverdueCustomsClearance ─────────────────────────────────────────────

describe("findOverdueCustomsClearance", () => {
  it("should return empty array for empty shipments", () => {
    const result = findOverdueCustomsClearance([], 7);
    expect(result).toHaveLength(0);
  });

  it("should detect arrived shipment past maxDays", () => {
    const shipments = [
      makeShipment({ shipmentId: "SHP-ARR", status: "arrived", arrivedAt: daysAgo(10) }),
    ];
    const result = findOverdueCustomsClearance(shipments, 7);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("SHP-ARR");
    expect(result[0].type).toBe("customs");
    expect(result[0].daysPending).toBeGreaterThanOrEqual(10);
  });

  it("should not flag non-arrived shipments", () => {
    const shipments = [
      makeShipment({ shipmentId: "SHP-IT", status: "in_transit", arrivedAt: daysAgo(10) }),
    ];
    const result = findOverdueCustomsClearance(shipments, 7);
    expect(result).toHaveLength(0);
  });

  it("should not flag arrived shipment within maxDays", () => {
    const shipments = [
      makeShipment({ shipmentId: "SHP-FRESH", status: "arrived", arrivedAt: daysAgo(3) }),
    ];
    const result = findOverdueCustomsClearance(shipments, 7);
    expect(result).toHaveLength(0);
  });

  it("should skip arrived shipment without arrivedAt", () => {
    const shipments = [
      makeShipment({ shipmentId: "SHP-NODATE", status: "arrived" }),
    ];
    const result = findOverdueCustomsClearance(shipments, 7);
    expect(result).toHaveLength(0);
  });

  it("should use default maxDays of 7 when not provided", () => {
    const overdue = [makeShipment({ shipmentId: "SHP-OVD", status: "arrived", arrivedAt: daysAgo(8) })];
    const fresh = [makeShipment({ shipmentId: "SHP-FRS", status: "arrived", arrivedAt: daysAgo(4) })];
    expect(findOverdueCustomsClearance(overdue)).toHaveLength(1);
    expect(findOverdueCustomsClearance(fresh)).toHaveLength(0);
  });

  it("should include detail string", () => {
    const shipments = [
      makeShipment({ shipmentId: "SHP-DT", blNumber: "BL-777", status: "arrived", arrivedAt: daysAgo(10) }),
    ];
    const result = findOverdueCustomsClearance(shipments, 7);
    expect(typeof result[0].detail).toBe("string");
    expect(result[0].detail.length).toBeGreaterThan(0);
  });
});

// ─── generateProcessReport ───────────────────────────────────────────────────

describe("generateProcessReport", () => {
  it("should return zero issues for all empty inputs", () => {
    const report = generateProcessReport([], []);
    expect(report.totalIssues).toBe(0);
    expect(report.documentChecks).toHaveLength(0);
    expect(report.overdueDeliveries).toHaveLength(0);
    expect(report.overdueCustoms).toHaveLength(0);
  });

  it("should include checkedAt ISO timestamp", () => {
    const report = generateProcessReport([], []);
    expect(report.checkedAt).toBeTruthy();
    expect(() => new Date(report.checkedAt)).not.toThrow();
  });

  it("should aggregate totalIssues from all three sources", () => {
    const shipments: ShipmentDoc[] = [
      makeShipment({ shipmentId: "SHP-X1", documents: [], status: "arrived", arrivedAt: daysAgo(10) }),
    ];
    const sales: SaleRecord[] = [
      makeSale({ id: "SALE-X1", saleDate: daysAgo(5), delivered: false }),
    ];
    const report = generateProcessReport(shipments, sales, DEFAULT_DOCS);
    // 1 shipment with missing docs + 1 overdue delivery + 1 overdue customs = at least some issues
    expect(report.totalIssues).toBeGreaterThan(0);
    expect(report.documentChecks).toHaveLength(1);
    expect(report.overdueDeliveries).toHaveLength(1);
    expect(report.overdueCustoms).toHaveLength(1);
  });

  it("should use default required_docs when not provided", () => {
    const shipments: ShipmentDoc[] = [makeShipment({ shipmentId: "SHP-DEF", documents: [] })];
    const report = generateProcessReport(shipments, []);
    expect(report.documentChecks[0].missingDocuments).toHaveLength(DEFAULT_DOCS.length);
  });

  it("should count totalIssues as sum of missingDoc shipments + overdueDeliveries + overdueCustoms", () => {
    // All docs present, no overdue → 0 issues
    const shipments: ShipmentDoc[] = [
      makeShipment({ shipmentId: "SHP-CLEAN", documents: [...DEFAULT_DOCS] }),
    ];
    const sales: SaleRecord[] = [
      makeSale({ id: "SALE-CLEAN", saleDate: daysAgo(1), delivered: false }),
    ];
    const report = generateProcessReport(shipments, sales, DEFAULT_DOCS);
    expect(report.totalIssues).toBe(0);
  });
});

// ─── tool registration ───────────────────────────────────────────────────────

describe("registerDocumentStatusTools", () => {
  it("should register tool without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerDocumentStatusTools } = await import("../../src/tools/document-status.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerDocumentStatusTools(server)).not.toThrow();
  });
});
