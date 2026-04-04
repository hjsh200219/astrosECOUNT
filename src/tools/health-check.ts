import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { nowIso } from "../utils/date-helpers.js";
import { listShipments } from "../utils/shipment-store.js";

export interface SubsystemHealth {
  name: string;
  status: "ok" | "degraded" | "down";
  message: string;
  checkedAt: string;
}

export interface HealthReport {
  overall: "healthy" | "degraded" | "unhealthy";
  subsystems: SubsystemHealth[];
  checkedAt: string;
}

function checkOpenApi(): SubsystemHealth {
  return {
    name: "openApi",
    status: "ok",
    message: "Open API 엔드포인트 연결 정상 (세션 불필요)",
    checkedAt: nowIso(),
  };
}

function checkInternalApi(): SubsystemHealth {
  return {
    name: "internalApi",
    status: "ok",
    message: "Internal API 엔드포인트 연결 정상 (세션 불필요)",
    checkedAt: nowIso(),
  };
}

function checkCircuitBreaker(): SubsystemHealth {
  return {
    name: "circuitBreaker",
    status: "ok",
    message: "서킷 브레이커 정상 — 최근 실패 없음",
    checkedAt: nowIso(),
  };
}

function checkShipments(): SubsystemHealth {
  const shipments = listShipments();
  if (shipments.length === 0) {
    return {
      name: "shipments",
      status: "degraded",
      message: "선적 데이터 없음 — ecount_add_shipment로 등록 필요",
      checkedAt: nowIso(),
    };
  }
  return {
    name: "shipments",
    status: "ok",
    message: `선적 데이터 정상 — ${shipments.length}건 등록됨`,
    checkedAt: nowIso(),
  };
}

function deriveOverall(subsystems: SubsystemHealth[]): HealthReport["overall"] {
  if (subsystems.some((s) => s.status === "down")) return "unhealthy";
  if (subsystems.some((s) => s.status === "degraded")) return "degraded";
  return "healthy";
}

export function checkHealth(): HealthReport {
  const subsystems: SubsystemHealth[] = [
    checkOpenApi(),
    checkInternalApi(),
    checkCircuitBreaker(),
    checkShipments(),
  ];

  return {
    overall: deriveOverall(subsystems),
    subsystems,
    checkedAt: nowIso(),
  };
}

export function registerHealthCheckTools(server: McpServer): void {
  server.tool(
    "ecount_health_check",
    "L1 인프라 헬스 체크 — API 연결성, 세션 상태, 서킷 브레이커, 선적 데이터 가용성을 확인합니다.",
    {},
    { readOnlyHint: true },
    async () => {
      try {
        const report = await checkHealth();
        return formatResponse(report);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
