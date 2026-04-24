import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { listShipments, type Shipment } from "../utils/shipment-store.js";
import { MS_PER_DAY } from "../utils/date-helpers.js";

export interface LogisticsKPI {
  totalShipments: number;
  byStatus: Record<string, number>;
  avgTransitDays: number | null;
  avgCustomsDays: number | null;
  onTimeRate: number | null;  // percentage
}

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / MS_PER_DAY);
}

export function calculateKPI(shipments: Shipment[]): LogisticsKPI {
  const total = shipments.length;

  const byStatus: Record<string, number> = {};
  for (const s of shipments) {
    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
  }

  // avgTransitDays: delivered shipments with both etd and eta
  const transitDeltas = shipments
    .filter((s) => s.status === "delivered" && s.etd && s.eta)
    .map((s) => daysBetween(s.etd!, s.eta!));

  const avgTransitDays =
    transitDeltas.length > 0
      ? Math.round((transitDeltas.reduce((a, b) => a + b, 0) / transitDeltas.length) * 10) / 10
      : null;

  // avgCustomsDays: not tracked per-shipment yet, return null
  const avgCustomsDays: number | null = null;

  // onTimeRate: delivered shipments with eta — defined as eta >= today (simplified)
  const deliveredWithEta = shipments.filter((s) => s.status === "delivered" && s.eta);
  const today = new Date().toISOString().slice(0, 10);
  const onTime = deliveredWithEta.filter((s) => s.eta! >= today);
  const onTimeRate =
    deliveredWithEta.length > 0
      ? Math.round((onTime.length / deliveredWithEta.length) * 1000) / 10
      : null;

  return { totalShipments: total, byStatus, avgTransitDays, avgCustomsDays, onTimeRate };
}

export function registerLogisticsKpiTools(server: McpServer): void {
  server.tool(
    "ecount_logistics_calc_logistics_kpi",
    "현재 선적 데이터를 기반으로 물류 KPI를 계산합니다. (총 선적 수, 상태별 집계, 평균 운송 일수, 정시 도착률)",
    {},
    { readOnlyHint: true },
    async () => {
      try {
        const shipments = listShipments();
        const kpi = calculateKPI(shipments);
        return formatResponse(kpi);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
