import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { listShipments } from "../utils/shipment-store.js";
import {
  type StaleShipment,
  type DelayedShipment,
  findStaleShipments,
  listStaleShipments,
  findCustomsDelays,
  findDeliveryDelays,
} from "../utils/stale-shipment-detector.js";

export type { StaleShipment, DelayedShipment };
export { findStaleShipments, listStaleShipments, findCustomsDelays, findDeliveryDelays };

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

  server.tool(
    "ecount_customs_delays",
    "입항 후 통관이 지연되고 있는 선적 건을 식별합니다. (status=arrived, N일 초과)",
    {
      maxDays: z.number().default(7).describe("통관 지연 기준 일수 (기본 7일)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const maxDays = (params.maxDays as number) ?? 7;
        const shipments = listShipments();
        const results = findCustomsDelays(shipments, maxDays);
        return formatResponse({ count: results.length, delayedShipments: results });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_delivery_delays",
    "통관 완료 후 배송이 지연되고 있는 선적 건을 식별합니다. (status=cleared, N일 초과)",
    {
      maxDays: z.number().default(3).describe("배송 지연 기준 일수 (기본 3일)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const maxDays = (params.maxDays as number) ?? 3;
        const shipments = listShipments();
        const results = findDeliveryDelays(shipments, maxDays);
        return formatResponse({ count: results.length, delayedShipments: results });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
