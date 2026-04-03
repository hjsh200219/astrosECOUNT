import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { getCargoTracking, getContainerInfo } from "../services/unipass/cargo-tracking.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export interface EtaChange {
  previousEta?: string;
  newEta: string;
  reason?: string;
  changedAt: string;
}

// ---------------------------------------------------------------------------
// In-memory storage (local registration data)
// ---------------------------------------------------------------------------

const SHIPMENTS: Map<string, Shipment> = new Map();
const ETA_HISTORY: Map<string, EtaChange[]> = new Map();
let idCounter = 1;

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(): string {
  return `SHP-${Date.now()}-${idCounter++}`;
}

// ---------------------------------------------------------------------------
// Local CRUD helpers
// ---------------------------------------------------------------------------

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

export function updateShipmentEta(id: string, eta: string, reason?: string): Shipment | null {
  const shipment = SHIPMENTS.get(id);
  if (!shipment) return null;
  const change: EtaChange = {
    previousEta: shipment.eta,
    newEta: eta,
    reason,
    changedAt: nowIso(),
  };
  const history = ETA_HISTORY.get(id) ?? [];
  history.push(change);
  ETA_HISTORY.set(id, history);
  const updated: Shipment = {
    ...shipment,
    eta,
    updatedAt: nowIso(),
  };
  SHIPMENTS.set(id, updated);
  return updated;
}

export function getEtaHistory(id: string): EtaChange[] {
  return ETA_HISTORY.get(id) ?? [];
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerShipmentTrackingTools(server: McpServer): void {
  // Register shipment (local only -- UNI-PASS is read-only)
  server.tool(
    "ecount_add_shipment",
    "새로운 선적(Shipment) 정보를 등록합니다. (로컬 등록 -- UNI-PASS 실시간 추적과 결합됩니다)",
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

  // Track shipment -- combines local data with real-time UNI-PASS tracking
  server.tool(
    "ecount_get_shipment",
    "선적 정보를 조회합니다. 로컬 등록 데이터와 UNI-PASS 실시간 통관 진행정보를 결합하여 반환합니다.",
    {
      id: z.string().optional().describe("선적 ID"),
      blNumber: z.string().optional().describe("B/L 번호"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        let localShipment: Shipment | null = null;
        let blNumber: string | null = null;

        if (params.id) {
          localShipment = getShipment(params.id as string);
          blNumber = localShipment?.blNumber ?? null;
        } else if (params.blNumber) {
          blNumber = params.blNumber as string;
          localShipment = getShipmentByBL(blNumber);
        } else {
          return formatResponse({ found: false, message: "id 또는 blNumber 중 하나를 입력하세요." });
        }

        // Fetch real-time tracking from UNI-PASS
        let unipassTracking = null;
        if (blNumber) {
          const trackingItems = await getCargoTracking(blNumber);
          if (trackingItems.length > 0) {
            unipassTracking = trackingItems;
          }
        }

        if (!localShipment && !unipassTracking) {
          return formatResponse({ found: false, message: "선적 정보를 찾을 수 없습니다." });
        }

        return formatResponse({
          found: true,
          shipment: localShipment ?? null,
          unipassTracking: unipassTracking ?? null,
        });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // Container info -- real-time from UNI-PASS
  server.tool(
    "ecount_get_container_info",
    "B/L 번호로 컨테이너 정보를 조회합니다. UNI-PASS API에서 실시간 데이터를 가져옵니다.",
    {
      blNumber: z.string().describe("B/L 번호"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const blNumber = params.blNumber as string;
        const containers = await getContainerInfo(blNumber);

        if (containers.length === 0) {
          return formatResponse({ found: false, message: `B/L '${blNumber}'에 대한 컨테이너 정보가 없습니다.` });
        }

        return formatResponse({ found: true, count: containers.length, containers });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // List shipments (in-memory -- no UNI-PASS equivalent)
  server.tool(
    "ecount_list_shipments",
    "선적 목록을 조회합니다. 상태 또는 선사로 필터링 가능합니다. (로컬 등록 데이터 기준)",
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

  // Update shipment status (local only -- UNI-PASS is read-only)
  server.tool(
    "ecount_update_shipment_status",
    "선적 상태를 업데이트합니다. (로컬 등록 데이터)",
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

  // Update ETA (local only)
  server.tool(
    "ecount_update_eta",
    "선적의 ETA(도착 예정일)를 업데이트하고 변경 이력을 기록합니다.",
    {
      id: z.string().describe("선적 ID"),
      eta: z.string().describe("새로운 ETA (YYYY-MM-DD)"),
      reason: z.string().optional().describe("ETA 변경 사유"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (params: Record<string, unknown>) => {
      try {
        const result = updateShipmentEta(
          params.id as string,
          params.eta as string,
          params.reason as string | undefined
        );
        if (!result) {
          return formatResponse({ success: false, message: `선적 ID '${params.id}'를 찾을 수 없습니다.` });
        }
        return formatResponse({ success: true, shipment: result });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // ETA history (local only)
  server.tool(
    "ecount_get_eta_history",
    "특정 선적의 ETA 변경 이력을 조회합니다.",
    {
      id: z.string().describe("선적 ID"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const history = getEtaHistory(params.id as string);
        return formatResponse({ count: history.length, history });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
