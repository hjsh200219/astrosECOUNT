import { describe, it, expect } from "vitest";
import {
  addShipment,
  getShipment,
  listShipments,
  updateShipmentStatus,
  getShipmentByBL,
  updateShipmentEta,
  getEtaHistory,
} from "../../src/utils/shipment-store.js";

describe("shipment-store", () => {
  it("addShipment should create a shipment with id and timestamps", () => {
    const shipment = addShipment({
      blNumber: "BL-TEST-001",
      carrier: "Maersk",
      product: "닭다리",
      origin: "Santos",
      destination: "Busan",
      status: "booked",
    });
    expect(shipment.id).toMatch(/^SHP-/);
    expect(shipment.blNumber).toBe("BL-TEST-001");
    expect(shipment.createdAt).toBeTruthy();
  });

  it("getShipment should return existing shipment", () => {
    const created = addShipment({
      blNumber: "BL-GET-001",
      carrier: "MSC",
      product: "등심",
      origin: "Chicago",
      destination: "Incheon",
      status: "in_transit",
    });
    const found = getShipment(created.id);
    expect(found).not.toBeNull();
    expect(found!.blNumber).toBe("BL-GET-001");
  });

  it("getShipment should return null for non-existent id", () => {
    expect(getShipment("non-existent")).toBeNull();
  });

  it("getShipmentByBL should find by BL number", () => {
    addShipment({
      blNumber: "BL-FIND-001",
      carrier: "Evergreen",
      product: "삼겹살",
      origin: "Rio",
      destination: "Busan",
      status: "booked",
    });
    const found = getShipmentByBL("BL-FIND-001");
    expect(found).not.toBeNull();
    expect(found!.carrier).toBe("Evergreen");
  });

  it("listShipments should return all shipments", () => {
    const all = listShipments();
    expect(all.length).toBeGreaterThan(0);
  });

  it("listShipments should filter by status", () => {
    addShipment({
      blNumber: "BL-FILTER-001",
      carrier: "HMM",
      product: "사태",
      origin: "Buenos Aires",
      destination: "Busan",
      status: "delivered",
    });
    const delivered = listShipments({ status: "delivered" });
    expect(delivered.every((s) => s.status === "delivered")).toBe(true);
  });

  it("updateShipmentStatus should update status", () => {
    const created = addShipment({
      blNumber: "BL-UPDATE-001",
      carrier: "ONE",
      product: "안심",
      origin: "Santos",
      destination: "Busan",
      status: "booked",
    });
    const updated = updateShipmentStatus(created.id, "departed");
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("departed");
  });

  it("updateShipmentEta should record eta change history", () => {
    const created = addShipment({
      blNumber: "BL-ETA-001",
      carrier: "CMA",
      product: "갈비",
      origin: "Santos",
      destination: "Busan",
      status: "in_transit",
      eta: "2026-05-01",
    });
    updateShipmentEta(created.id, "2026-05-05", "기상 악화");
    const history = getEtaHistory(created.id);
    expect(history).toHaveLength(1);
    expect(history[0].previousEta).toBe("2026-05-01");
    expect(history[0].newEta).toBe("2026-05-05");
    expect(history[0].reason).toBe("기상 악화");
  });
});
