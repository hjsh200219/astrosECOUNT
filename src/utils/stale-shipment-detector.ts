import { type Shipment, listShipments } from "./shipment-store.js";
import { daysSince, MS_PER_DAY } from "./date-helpers.js";

export interface StaleShipment {
  shipment: Shipment;
  daysSinceUpdate: number;
  recommendation: string;
}

export interface DelayedShipment {
  shipment: Shipment;
  daysDelayed: number;
  delayType: "customs" | "delivery";
  recommendation: string;
}

function getRecommendation(status: Shipment["status"]): string {
  switch (status) {
    case "in_transit":
      return "상태 확인 필요";
    case "customs":
      return "통관 지연 확인";
    case "booked":
      return "출발 지연";
    default:
      return "갱신 필요";
  }
}

export function findStaleShipments(shipments: Shipment[], staleDays: number): StaleShipment[] {
  const now = Date.now();
  const results: StaleShipment[] = [];

  for (const shipment of shipments) {
    const updatedMs = new Date(shipment.updatedAt).getTime();
    const daysSinceUpdate = Math.floor((now - updatedMs) / MS_PER_DAY);

    if (daysSinceUpdate >= staleDays) {
      results.push({ shipment, daysSinceUpdate, recommendation: getRecommendation(shipment.status) });
    }
  }

  return results;
}

export function listStaleShipments(staleDays: number = 7): StaleShipment[] {
  return findStaleShipments(listShipments(), staleDays);
}

export function findCustomsDelays(shipments: Shipment[], maxDays: number = 7): DelayedShipment[] {
  return shipments
    .filter((s) => s.status === "arrived")
    .map((s) => ({ shipment: s, daysDelayed: daysSince(s.updatedAt) }))
    .filter(({ daysDelayed }) => daysDelayed > maxDays)
    .map(({ shipment, daysDelayed }) => ({
      shipment,
      daysDelayed,
      delayType: "customs" as const,
      recommendation: `통관 지연 ${daysDelayed}일 — 관세사 확인 필요`,
    }));
}

export function findDeliveryDelays(shipments: Shipment[], maxDays: number = 3): DelayedShipment[] {
  return shipments
    .filter((s) => s.status === "cleared")
    .map((s) => ({ shipment: s, daysDelayed: daysSince(s.updatedAt) }))
    .filter(({ daysDelayed }) => daysDelayed > maxDays)
    .map(({ shipment, daysDelayed }) => ({
      shipment,
      daysDelayed,
      delayType: "delivery" as const,
      recommendation: `배송 지연 ${daysDelayed}일 — 배송사 확인 필요`,
    }));
}
