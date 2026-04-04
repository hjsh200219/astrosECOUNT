import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { nowIso } from "../utils/date-helpers.js";
import { generateId } from "../utils/id-generator.js";

export interface InventoryAdjustment {
  id: string;
  product: string;
  warehouse: string;
  quantityChange: number;
  reason: string;
  adjustedBy: string;
  createdAt: string;
}

export interface AdjustmentFilter {
  product?: string;
  warehouse?: string;
}

const ADJUSTMENTS: Map<string, InventoryAdjustment> = new Map();

export function adjustInventory(
  data: Omit<InventoryAdjustment, "id" | "createdAt">
): InventoryAdjustment {
  if (!data.reason || data.reason.trim() === "") {
    throw new Error("reason must not be empty");
  }
  if (data.quantityChange === 0) {
    throw new Error("quantityChange must not be zero");
  }
  const adjustment: InventoryAdjustment = {
    ...data,
    id: generateId("ADJ"),
    createdAt: nowIso(),
  };
  ADJUSTMENTS.set(adjustment.id, adjustment);
  return adjustment;
}

export function listAdjustments(filter?: AdjustmentFilter): InventoryAdjustment[] {
  let results = Array.from(ADJUSTMENTS.values());
  if (filter?.product) {
    results = results.filter((a) => a.product === filter.product);
  }
  if (filter?.warehouse) {
    results = results.filter((a) => a.warehouse === filter.warehouse);
  }
  return results;
}

export function getAdjustmentHistory(product: string): InventoryAdjustment[] {
  return Array.from(ADJUSTMENTS.values()).filter((a) => a.product === product);
}

export function registerAdjustInventoryTools(server: McpServer): void {
  server.tool(
    "ecount_adjust_inventory",
    "재고 수량을 수동으로 조정합니다. 사유와 담당자를 함께 기록하여 감사 추적을 제공합니다.",
    {
      product: z.string().describe("품목명"),
      warehouse: z.string().describe("창고 코드 또는 이름"),
      quantityChange: z.number().describe("수량 변경값 (양수: 증가, 음수: 감소, 0 불가)"),
      reason: z.string().describe("조정 사유 (필수, 비어있을 수 없음)"),
      adjustedBy: z.string().describe("조정 담당자"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (params: Record<string, unknown>) => {
      try {
        const adjustment = adjustInventory({
          product: params.product as string,
          warehouse: params.warehouse as string,
          quantityChange: params.quantityChange as number,
          reason: params.reason as string,
          adjustedBy: params.adjustedBy as string,
        });
        return formatResponse({ success: true, adjustment });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_list_adjustments",
    "재고 조정 이력을 조회합니다. 품목 또는 창고로 필터링 가능합니다.",
    {
      product: z.string().optional().describe("품목 필터"),
      warehouse: z.string().optional().describe("창고 필터"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const results = listAdjustments({
          product: params.product as string | undefined,
          warehouse: params.warehouse as string | undefined,
        });
        return formatResponse({ count: results.length, adjustments: results });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
