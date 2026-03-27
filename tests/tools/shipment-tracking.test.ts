import { describe, it, expect, beforeEach } from "vitest";
import {
  addShipment,
  getShipment,
  listShipments,
  updateShipmentStatus,
  getShipmentByBL,
  updateShipmentEta,
  getEtaHistory,
  type Shipment,
  type EtaChange,
} from "../../src/tools/shipment-tracking.js";

// Each test that adds shipments uses unique BL numbers to avoid cross-test pollution
// since the in-memory store persists across tests in the same run.

describe("addShipment", () => {
  it("should add a shipment and return it with generated id", () => {
    const shipment = addShipment({
      blNumber: "BL-TEST-001",
      carrier: "Maersk",
      product: "돈육 삼겹살",
      origin: "Santos, Brazil",
      destination: "Busan, Korea",
      status: "booked",
    });
    expect(shipment.id).toBeTruthy();
    expect(shipment.blNumber).toBe("BL-TEST-001");
    expect(shipment.carrier).toBe("Maersk");
    expect(shipment.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(shipment.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("should assign unique ids to different shipments", () => {
    const s1 = addShipment({ blNumber: "BL-UNIQUE-001", carrier: "MSC", product: "소고기", origin: "Santos", destination: "Busan", status: "booked" });
    const s2 = addShipment({ blNumber: "BL-UNIQUE-002", carrier: "MSC", product: "소고기", origin: "Santos", destination: "Busan", status: "booked" });
    expect(s1.id).not.toBe(s2.id);
  });
});

describe("getShipment", () => {
  it("should retrieve shipment by id", () => {
    const added = addShipment({ blNumber: "BL-GET-001", carrier: "Evergreen", product: "닭고기", origin: "Bangkok", destination: "Incheon", status: "in_transit" });
    const found = getShipment(added.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(added.id);
  });

  it("should return null for unknown id", () => {
    expect(getShipment("nonexistent-id")).toBeNull();
  });
});

describe("getShipmentByBL", () => {
  it("should retrieve shipment by BL number", () => {
    const added = addShipment({ blNumber: "BL-BYBL-001", carrier: "COSCO", product: "돈육", origin: "Santos", destination: "Busan", status: "departed" });
    const found = getShipmentByBL("BL-BYBL-001");
    expect(found).not.toBeNull();
    expect(found!.blNumber).toBe("BL-BYBL-001");
  });

  it("should return null for unknown BL number", () => {
    expect(getShipmentByBL("BL-DOES-NOT-EXIST")).toBeNull();
  });
});

describe("listShipments", () => {
  it("should list all shipments without filter", () => {
    const before = listShipments().length;
    addShipment({ blNumber: "BL-LIST-001", carrier: "Hapag", product: "소고기", origin: "Santos", destination: "Busan", status: "arrived" });
    const after = listShipments().length;
    expect(after).toBe(before + 1);
  });

  it("should filter by status", () => {
    addShipment({ blNumber: "BL-FILTER-001", carrier: "Maersk", product: "돈육", origin: "Santos", destination: "Busan", status: "customs" });
    addShipment({ blNumber: "BL-FILTER-002", carrier: "MSC", product: "닭고기", origin: "Santos", destination: "Busan", status: "delivered" });
    const customsShipments = listShipments({ status: "customs" });
    expect(customsShipments.every((s) => s.status === "customs")).toBe(true);
    expect(customsShipments.length).toBeGreaterThanOrEqual(1);
  });

  it("should filter by carrier", () => {
    addShipment({ blNumber: "BL-CARRIER-001", carrier: "TestCarrier", product: "돼지갈비", origin: "Santos", destination: "Busan", status: "cleared" });
    const results = listShipments({ carrier: "TestCarrier" });
    expect(results.every((s) => s.carrier === "TestCarrier")).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe("updateShipmentStatus", () => {
  it("should update status and updatedAt", () => {
    const added = addShipment({ blNumber: "BL-UPD-001", carrier: "Maersk", product: "돈육", origin: "Santos", destination: "Busan", status: "booked" });
    const updated = updateShipmentStatus(added.id, "departed");
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("departed");
    expect(updated!.id).toBe(added.id);
  });

  it("should return null for unknown id", () => {
    const result = updateShipmentStatus("nonexistent", "arrived");
    expect(result).toBeNull();
  });
});

describe("registerShipmentTrackingTools", () => {
  it("should register tools without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerShipmentTrackingTools } = await import("../../src/tools/shipment-tracking.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerShipmentTrackingTools(server)).not.toThrow();
  });
});

describe("updateShipmentEta", () => {
  it("should update eta field and updatedAt", () => {
    const added = addShipment({
      blNumber: "BL-ETA-001",
      carrier: "Maersk",
      product: "돈육",
      origin: "Santos",
      destination: "Busan",
      status: "in_transit",
    });
    const updated = updateShipmentEta(added.id, "2026-04-15");
    expect(updated).not.toBeNull();
    expect(updated!.eta).toBe("2026-04-15");
    expect(updated!.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
    // Verify the stored shipment also reflects the change
    const fetched = getShipment(added.id);
    expect(fetched!.eta).toBe("2026-04-15");
  });

  it("should return null for non-existent shipment", () => {
    const result = updateShipmentEta("nonexistent-id", "2026-04-15");
    expect(result).toBeNull();
  });

  it("should store reason in eta history", () => {
    const added = addShipment({
      blNumber: "BL-ETA-002",
      carrier: "MSC",
      product: "소고기",
      origin: "Santos",
      destination: "Busan",
      status: "in_transit",
      eta: "2026-04-10",
    });
    updateShipmentEta(added.id, "2026-04-20", "항구 혼잡");
    const history = getEtaHistory(added.id);
    expect(history).toHaveLength(1);
    expect(history[0].reason).toBe("항구 혼잡");
    expect(history[0].newEta).toBe("2026-04-20");
    expect(history[0].previousEta).toBe("2026-04-10");
  });

  it("should record changedAt timestamp in history", () => {
    const added = addShipment({
      blNumber: "BL-ETA-003",
      carrier: "Evergreen",
      product: "닭고기",
      origin: "Bangkok",
      destination: "Incheon",
      status: "departed",
    });
    updateShipmentEta(added.id, "2026-05-01");
    const history = getEtaHistory(added.id);
    expect(history[0].changedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});

describe("getEtaHistory", () => {
  it("should return all ETA changes for a shipment", () => {
    const added = addShipment({
      blNumber: "BL-ETAHIST-001",
      carrier: "COSCO",
      product: "돈육",
      origin: "Santos",
      destination: "Busan",
      status: "in_transit",
    });
    updateShipmentEta(added.id, "2026-04-10");
    updateShipmentEta(added.id, "2026-04-15", "악천후");
    updateShipmentEta(added.id, "2026-04-18", "항구 혼잡");
    const history = getEtaHistory(added.id);
    expect(history).toHaveLength(3);
  });

  it("should return empty array for shipment with no eta changes", () => {
    const added = addShipment({
      blNumber: "BL-ETAHIST-002",
      carrier: "Hapag",
      product: "소고기",
      origin: "Santos",
      destination: "Busan",
      status: "booked",
    });
    expect(getEtaHistory(added.id)).toEqual([]);
  });

  it("should return empty array for non-existent shipment", () => {
    expect(getEtaHistory("nonexistent-id")).toEqual([]);
  });
});
