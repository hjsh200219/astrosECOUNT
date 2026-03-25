import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { type Shipment, listShipments } from "./shipment-tracking.js";

export interface StaleShipment {
  shipment: Shipment;
  daysSinceUpdate: number;
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
    const diffMs = now - updatedMs;
    const daysSinceUpdate = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (daysSinceUpdate >= staleDays) {
      results.push({
        shipment,
        daysSinceUpdate,
        recommendation: getRecommendation(shipment.status),
      });
    }
  }

  return results;
}

export function listStaleShipments(staleDays: number = 7): StaleShipment[] {
  const shipments = listShipments();
  return findStaleShipments(shipments, staleDays);
}

export function registerStaleShipmentTools(server: McpServer): void {
  server.tool(
    "ecount_stale_shipments",
    "N일 이상 상태가 갱신되지 않은 선적 건을 식별합니다.",
    {
      days: z.number().default(7).describe("미갱신 기준 일수 (기본 7일)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const days = (params.days as number) ?? 7;
        const results = listStaleShipments(days);
        return formatResponse({ count: results.length, staleShipments: results });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
