import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface Shipment {
  id: string;
  blNumber: string;
  carrier: string;
  product: string;
  origin: string;
  destination: string;
  etd?: string;          // YYYY-MM-DD
  eta?: string;          // YYYY-MM-DD
  status: "booked" | "departed" | "in_transit" | "arrived" | "customs" | "cleared" | "delivered";
  containerNo?: string;
  weight?: number;       // kg
  createdAt: string;
  updatedAt: string;
}

const SHIPMENTS: Map<string, Shipment> = new Map();
let idCounter = 1;

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(): string {
  return `SHP-${Date.now()}-${idCounter++}`;
}

export function addShipment(data: Omit<Shipment, "id" | "createdAt" | "updatedAt">): Shipment {
  const now = nowIso();
  const shipment: Shipment = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  SHIPMENTS.set(shipment.id, shipment);
  return shipment;
}

export function getShipment(id: string): Shipment | null {
  return SHIPMENTS.get(id) ?? null;
}

export function listShipments(filter?: { status?: string; carrier?: string }): Shipment[] {
  let results = Array.from(SHIPMENTS.values());
  if (filter?.status) {
    results = results.filter((s) => s.status === filter.status);
  }
  if (filter?.carrier) {
    results = results.filter((s) => s.carrier === filter.carrier);
  }
  return results;
}

export function updateShipmentStatus(id: string, status: string): Shipment | null {
  const shipment = SHIPMENTS.get(id);
  if (!shipment) return null;
  const updated: Shipment = {
    ...shipment,
    status: status as Shipment["status"],
    updatedAt: nowIso(),
  };
  SHIPMENTS.set(id, updated);
  return updated;
}

export function getShipmentByBL(blNumber: string): Shipment | null {
  for (const shipment of SHIPMENTS.values()) {
    if (shipment.blNumber === blNumber) return shipment;
  }
  return null;
}

export function registerShipmentTrackingTools(server: McpServer): void {
  server.tool(
    "ecount_add_shipment",
    "새로운 선적(Shipment) 정보를 등록합니다.",
    {
      blNumber: z.string().describe("B/L 번호"),
      carrier: z.string().describe("선사명 (예: Maersk, MSC, Evergreen)"),
      product: z.string().describe("품목명"),
      origin: z.string().describe("출발지 (예: Santos, Brazil)"),
      destination: z.string().describe("도착지 (예: Busan, Korea)"),
      etd: z.string().optional().describe("출발 예정일 YYYY-MM-DD"),
      eta: z.string().optional().describe("도착 예정일 YYYY-MM-DD"),
      status: z
        .enum(["booked", "departed", "in_transit", "arrived", "customs", "cleared", "delivered"])
        .describe("선적 상태"),
      containerNo: z.string().optional().describe("컨테이너 번호"),
      weight: z.number().optional().describe("중량 (kg)"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (params: Record<string, unknown>) => {
      try {
        const shipment = addShipment({
          blNumber: params.blNumber as string,
          carrier: params.carrier as string,
          product: params.product as string,
          origin: params.origin as string,
          destination: params.destination as string,
          etd: params.etd as string | undefined,
          eta: params.eta as string | undefined,
          status: params.status as Shipment["status"],
          containerNo: params.containerNo as string | undefined,
          weight: params.weight as number | undefined,
        });
        return formatResponse({ success: true, shipment });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_get_shipment",
    "선적 ID 또는 B/L 번호로 선적 정보를 조회합니다.",
    {
      id: z.string().optional().describe("선적 ID"),
      blNumber: z.string().optional().describe("B/L 번호"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        let result: Shipment | null = null;
        if (params.id) {
          result = getShipment(params.id as string);
        } else if (params.blNumber) {
          result = getShipmentByBL(params.blNumber as string);
        } else {
          return formatResponse({ found: false, message: "id 또는 blNumber 중 하나를 입력하세요." });
        }
        if (!result) {
          return formatResponse({ found: false, message: "선적 정보를 찾을 수 없습니다." });
        }
        return formatResponse({ found: true, shipment: result });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_list_shipments",
    "선적 목록을 조회합니다. 상태 또는 선사로 필터링 가능합니다.",
    {
      status: z
        .enum(["booked", "departed", "in_transit", "arrived", "customs", "cleared", "delivered"])
        .optional()
        .describe("상태 필터"),
      carrier: z.string().optional().describe("선사 필터"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const results = listShipments({
          status: params.status as string | undefined,
          carrier: params.carrier as string | undefined,
        });
        return formatResponse({ count: results.length, shipments: results });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_update_shipment_status",
    "선적 상태를 업데이트합니다.",
    {
      id: z.string().describe("선적 ID"),
      status: z
        .enum(["booked", "departed", "in_transit", "arrived", "customs", "cleared", "delivered"])
        .describe("새로운 상태"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (params: Record<string, unknown>) => {
      try {
        const result = updateShipmentStatus(params.id as string, params.status as string);
        if (!result) {
          return formatResponse({ success: false, message: `선적 ID '${params.id}'를 찾을 수 없습니다.` });
        }
        return formatResponse({ success: true, shipment: result });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
