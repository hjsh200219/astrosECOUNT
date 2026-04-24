import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import {
  type Shipment,
  type EtaChange,
  addShipment,
  getShipment,
  listShipments,
  updateShipmentStatus,
  getShipmentByBL,
  updateShipmentEta,
  getEtaHistory,
} from "../utils/shipment-store.js";

export type { Shipment, EtaChange };
export { addShipment, getShipment, listShipments, updateShipmentStatus, getShipmentByBL, updateShipmentEta, getEtaHistory };

const SHIPMENT_STATUS = ["booked", "departed", "in_transit", "arrived", "customs", "cleared", "delivered"] as const;

async function handleAddShipment(params: Record<string, unknown>) {
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

async function handleGetShipment(params: Record<string, unknown>) {
  try {
    let shipment: Shipment | null = null;

    if (params.id) {
      shipment = getShipment(params.id as string);
    } else if (params.blNumber) {
      shipment = getShipmentByBL(params.blNumber as string);
    } else {
      return formatResponse({ found: false, message: "id 또는 blNumber 중 하나를 입력하세요." });
    }

    if (!shipment) {
      return formatResponse({ found: false, message: "선적 정보를 찾을 수 없습니다." });
    }

    return formatResponse({ found: true, shipment });
  } catch (error) {
    return handleToolError(error);
  }
}

async function handleListShipments(params: Record<string, unknown>) {
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

async function handleUpdateStatus(params: Record<string, unknown>) {
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

async function handleUpdateEta(params: Record<string, unknown>) {
  try {
    const result = updateShipmentEta(
      params.id as string,
      params.eta as string,
      params.reason as string | undefined,
    );
    if (!result) {
      return formatResponse({ success: false, message: `선적 ID '${params.id}'를 찾을 수 없습니다.` });
    }
    return formatResponse({ success: true, shipment: result });
  } catch (error) {
    return handleToolError(error);
  }
}

async function handleGetEtaHistory(params: Record<string, unknown>) {
  try {
    const history = getEtaHistory(params.id as string);
    return formatResponse({ count: history.length, history });
  } catch (error) {
    return handleToolError(error);
  }
}

export function registerShipmentTrackingTools(server: McpServer): void {
  server.tool(
    "ecount_shipment_add_shipment", "새로운 선적(Shipment) 정보를 등록합니다.",
    {
      blNumber: z.string(),
      carrier: z.string().describe("선사명 (예: Maersk, MSC, Evergreen)"),
      product: z.string(),
      origin: z.string().describe("출발지 (예: Santos, Brazil)"),
      destination: z.string().describe("도착지 (예: Busan, Korea)"),
      etd: z.string().optional().describe("출발 예정일 YYYY-MM-DD"),
      eta: z.string().optional().describe("도착 예정일 YYYY-MM-DD"),
      status: z.enum(SHIPMENT_STATUS),
      containerNo: z.string().optional(),
      weight: z.number().optional().describe("중량 (kg)"),
    },
    { readOnlyHint: false, destructiveHint: false },
    handleAddShipment,
  );

  server.tool(
    "ecount_shipment_get_shipment", "선적 정보를 조회합니다. ID 또는 B/L 번호로 검색 가능합니다.",
    { id: z.string().optional(), blNumber: z.string().optional() },
    { readOnlyHint: true },
    handleGetShipment,
  );

  server.tool(
    "ecount_shipment_list_shipments", "선적 목록을 조회합니다. 상태 또는 선사로 필터링 가능합니다. (로컬 등록 데이터 기준)",
    { status: z.enum(SHIPMENT_STATUS).optional(), carrier: z.string().optional() },
    { readOnlyHint: true },
    handleListShipments,
  );

  server.tool(
    "ecount_shipment_update_shipment_status", "선적 상태를 업데이트합니다. (로컬 등록 데이터)",
    { id: z.string(), status: z.enum(SHIPMENT_STATUS) },
    { readOnlyHint: false, destructiveHint: false },
    handleUpdateStatus,
  );

  server.tool(
    "ecount_shipment_update_eta", "선적의 ETA(도착 예정일)를 업데이트하고 변경 이력을 기록합니다.",
    { id: z.string(), eta: z.string().describe("YYYY-MM-DD"), reason: z.string().optional() },
    { readOnlyHint: false, destructiveHint: false },
    handleUpdateEta,
  );

  server.tool(
    "ecount_shipment_get_eta_history", "특정 선적의 ETA 변경 이력을 조회합니다.",
    { id: z.string() },
    { readOnlyHint: true },
    handleGetEtaHistory,
  );
}
