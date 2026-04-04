import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import {
  STAGES,
  type Stage,
  type InventoryTransition,
  transitions,
  addTransition,
} from "../utils/inventory-transition-store.js";

export type { Stage, InventoryTransition };
export { STAGES, transitions };

export function trackInventoryStage(params: {
  shipmentId: string;
  product: string;
  fromStage: Stage;
  toStage: Stage;
  quantity: number;
  warehouse?: string;
}): InventoryTransition {
  return addTransition(params);
}

export function getInventoryPipeline(params: {
  product?: string;
  stage?: Stage;
}): { pipeline: { shipmentId: string; product: string; currentStage: Stage; quantity: number; warehouse?: string }[]; totalItems: number } {
  const allTransitions = Array.from(transitions.values());

  const grouped = new Map<string, InventoryTransition>();
  for (const t of allTransitions) {
    const key = `${t.shipmentId}::${t.product}`;
    const existing = grouped.get(key);
    if (!existing || STAGES.indexOf(t.toStage) > STAGES.indexOf(existing.toStage)) {
      grouped.set(key, t);
    }
  }

  let pipeline = Array.from(grouped.values()).map((t) => ({
    shipmentId: t.shipmentId,
    product: t.product,
    currentStage: t.toStage,
    quantity: t.quantity,
    warehouse: t.warehouse,
  }));

  if (params.product) pipeline = pipeline.filter((p) => p.product === params.product);
  if (params.stage) pipeline = pipeline.filter((p) => p.currentStage === params.stage);

  return { pipeline, totalItems: pipeline.length };
}

export function registerInventoryLifecycleTools(server: McpServer): void {
  const stageEnum = z.enum(STAGES as unknown as [string, ...string[]]);

  server.tool(
    "ecount_track_inventory_stage",
    "재고 5단계 상태 전환을 기록합니다 (계약→미착→도착→상품→판매완료).",
    {
      shipmentId: z.string().describe("선적 ID"),
      product: z.string().describe("품목명"),
      fromStage: stageEnum.describe("현재 단계 (계약/미착/도착/상품/판매완료)"),
      toStage: stageEnum.describe("전환할 단계 (계약/미착/도착/상품/판매완료)"),
      quantity: z.number().positive().describe("수량 (kg)"),
      warehouse: z.string().optional().describe("창고명 (선택)"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (params: Record<string, unknown>) => {
      try {
        const result = trackInventoryStage({
          shipmentId: params.shipmentId as string,
          product: params.product as string,
          fromStage: params.fromStage as Stage,
          toStage: params.toStage as Stage,
          quantity: params.quantity as number,
          warehouse: params.warehouse as string | undefined,
        });
        return formatResponse({ success: true, transition: result });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_get_inventory_pipeline",
    "품목별 재고 5단계 파이프라인 현황을 조회합니다.",
    {
      product: z.string().optional().describe("품목명 필터"),
      stage: stageEnum.optional().describe("단계 필터"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = getInventoryPipeline({
          product: params.product as string | undefined,
          stage: params.stage as Stage | undefined,
        });
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
