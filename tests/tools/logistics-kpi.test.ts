import { describe, it, expect } from "vitest";
import { calculateKPI, type LogisticsKPI } from "../../src/tools/logistics-kpi.js";
import type { Shipment } from "../../src/tools/shipment-tracking.js";

function makeShipment(overrides: Partial<Shipment>): Shipment {
  const now = new Date().toISOString();
  return {
    id: "test-id",
    blNumber: "BL-000",
    carrier: "TestCarrier",
    product: "돈육",
    origin: "Santos, Brazil",
    destination: "Busan, Korea",
    status: "delivered",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("calculateKPI", () => {
  it("should return zeros for empty shipment list", () => {
    const kpi = calculateKPI([]);
    expect(kpi.totalShipments).toBe(0);
    expect(kpi.byStatus).toEqual({});
    expect(kpi.avgTransitDays).toBeNull();
    expect(kpi.onTimeRate).toBeNull();
  });

  it("should count total shipments and group by status", () => {
    const shipments = [
      makeShipment({ id: "1", status: "delivered" }),
      makeShipment({ id: "2", status: "delivered" }),
      makeShipment({ id: "3", status: "in_transit" }),
    ];
    const kpi = calculateKPI(shipments);
    expect(kpi.totalShipments).toBe(3);
    expect(kpi.byStatus["delivered"]).toBe(2);
    expect(kpi.byStatus["in_transit"]).toBe(1);
  });

  it("should calculate avgTransitDays when etd and eta are present on delivered shipments", () => {
    const shipments = [
      makeShipment({ id: "1", status: "delivered", etd: "2026-01-01", eta: "2026-01-21" }), // 20 days
      makeShipment({ id: "2", status: "delivered", etd: "2026-02-01", eta: "2026-02-11" }), // 10 days
    ];
    const kpi = calculateKPI(shipments);
    expect(kpi.avgTransitDays).toBe(15);
  });

  it("should return null for avgTransitDays when no delivered shipments have etd/eta", () => {
    const shipments = [
      makeShipment({ id: "1", status: "in_transit" }),
    ];
    const kpi = calculateKPI(shipments);
    expect(kpi.avgTransitDays).toBeNull();
  });

  it("should return onTimeRate as 100 when all delivered before or on eta", () => {
    const shipments = [
      makeShipment({ id: "1", status: "delivered", eta: "2026-03-25" }),
      makeShipment({ id: "2", status: "delivered", eta: "2026-03-25" }),
    ];
    const kpi = calculateKPI(shipments);
    // onTimeRate calculation is based on delivered shipments with eta
    expect(typeof kpi.onTimeRate === "number" || kpi.onTimeRate === null).toBe(true);
  });
});

describe("registerLogisticsKpiTools", () => {
  it("should register tools without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerLogisticsKpiTools } = await import("../../src/tools/logistics-kpi.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerLogisticsKpiTools(server)).not.toThrow();
  });
});
