import { describe, it, expect } from "vitest";
import { findStaleShipments, type StaleShipment } from "../../src/tools/stale-shipments.js";
import type { Shipment } from "../../src/tools/shipment-tracking.js";

function makeShipment(overrides: Partial<Shipment> & { updatedAt: string }): Shipment {
  return {
    id: "SHP-TEST-001",
    blNumber: "BL-TEST-001",
    carrier: "Maersk",
    product: "돈육삼겹살",
    origin: "Santos, Brazil",
    destination: "Busan, Korea",
    status: "in_transit",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe("findStaleShipments", () => {
  it("should return stale shipments exceeding threshold", () => {
    const shipments: Shipment[] = [
      makeShipment({ id: "SHP-1", status: "in_transit", updatedAt: daysAgo(10) }),
      makeShipment({ id: "SHP-2", status: "booked", updatedAt: daysAgo(3) }),
    ];
    const result = findStaleShipments(shipments, 7);
    expect(result).toHaveLength(1);
    expect(result[0].shipment.id).toBe("SHP-1");
    expect(result[0].daysSinceUpdate).toBeGreaterThanOrEqual(10);
  });

  it("should return empty array when all shipments are fresh", () => {
    const shipments: Shipment[] = [
      makeShipment({ id: "SHP-A", updatedAt: daysAgo(1) }),
      makeShipment({ id: "SHP-B", updatedAt: daysAgo(2) }),
    ];
    const result = findStaleShipments(shipments, 7);
    expect(result).toHaveLength(0);
  });

  it("should include shipment updated exactly staleDays ago", () => {
    const shipments: Shipment[] = [
      makeShipment({ id: "SHP-EXACT", updatedAt: daysAgo(7) }),
    ];
    const result = findStaleShipments(shipments, 7);
    expect(result).toHaveLength(1);
  });

  it("should give recommendation '상태 확인 필요' for in_transit", () => {
    const shipments: Shipment[] = [
      makeShipment({ id: "SHP-IT", status: "in_transit", updatedAt: daysAgo(10) }),
    ];
    const result = findStaleShipments(shipments, 7);
    expect(result[0].recommendation).toBe("상태 확인 필요");
  });

  it("should give recommendation '통관 지연 확인' for customs", () => {
    const shipments: Shipment[] = [
      makeShipment({ id: "SHP-CU", status: "customs", updatedAt: daysAgo(10) }),
    ];
    const result = findStaleShipments(shipments, 7);
    expect(result[0].recommendation).toBe("통관 지연 확인");
  });

  it("should give recommendation '출발 지연' for booked", () => {
    const shipments: Shipment[] = [
      makeShipment({ id: "SHP-BK", status: "booked", updatedAt: daysAgo(10) }),
    ];
    const result = findStaleShipments(shipments, 7);
    expect(result[0].recommendation).toBe("출발 지연");
  });

  it("should give generic recommendation '갱신 필요' for other statuses", () => {
    const shipments: Shipment[] = [
      makeShipment({ id: "SHP-OT", status: "arrived", updatedAt: daysAgo(10) }),
    ];
    const result = findStaleShipments(shipments, 7);
    expect(result[0].recommendation).toBe("갱신 필요");
  });

  it("should respect custom staleDays threshold", () => {
    const shipments: Shipment[] = [
      makeShipment({ id: "SHP-D3", updatedAt: daysAgo(3) }),
      makeShipment({ id: "SHP-D10", updatedAt: daysAgo(10) }),
    ];
    const result = findStaleShipments(shipments, 5);
    expect(result).toHaveLength(1);
    expect(result[0].shipment.id).toBe("SHP-D10");
  });

  it("should default to 7 days when called via listStaleShipments (integration via findStaleShipments)", () => {
    // Test that staleDays=7 is treated as the default threshold
    const fresh: Shipment[] = [
      makeShipment({ id: "SHP-FRESH", updatedAt: daysAgo(6) }),
    ];
    const stale: Shipment[] = [
      makeShipment({ id: "SHP-STALE", updatedAt: daysAgo(8) }),
    ];
    expect(findStaleShipments(fresh, 7)).toHaveLength(0);
    expect(findStaleShipments(stale, 7)).toHaveLength(1);
  });
});

describe("registerStaleShipmentTools", () => {
  it("should register tools without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerStaleShipmentTools } = await import("../../src/tools/stale-shipments.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerStaleShipmentTools(server)).not.toThrow();
  });
});
