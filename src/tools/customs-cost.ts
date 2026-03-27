import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface AdditionalCost {
  name: string;    // e.g., "운송비", "보험료", "하역비"
  amount: number;  // KRW
}

export interface CostOverride {
  id: string;
  shipmentId: string;
  customsDuty: number;
  additionalCosts: AdditionalCost[];
  reason: string;
  overriddenBy: string;
  createdAt: string;
}

export interface LandedCostResult {
  shipmentId: string;
  basePrice: number;
  exchangeRate: number;
  basePriceKrw: number;
  customsDuty: number;
  additionalCostsTotal: number;
  additionalCostsBreakdown: AdditionalCost[];
  landedCost: number;
}

const COST_OVERRIDES: Map<string, CostOverride> = new Map();

let _idCounter = 0;

function generateId(): string {
  return `co-${Date.now()}-${++_idCounter}`;
}

export function addCostOverride(override: Omit<CostOverride, "id" | "createdAt">): CostOverride {
  const record: CostOverride = {
    id: generateId(),
    ...override,
    createdAt: new Date().toISOString(),
  };
  COST_OVERRIDES.set(override.shipmentId, record);
  return record;
}

export function getCostOverride(shipmentId: string): CostOverride | null {
  return COST_OVERRIDES.get(shipmentId) ?? null;
}

export function calculateLandedCost(
  shipmentId: string,
  basePrice: number,
  exchangeRate: number,
): LandedCostResult | null {
  const override = COST_OVERRIDES.get(shipmentId);
  if (!override) return null;

  const basePriceKrw = basePrice * exchangeRate;
  const additionalCostsTotal = override.additionalCosts.reduce((sum, c) => sum + c.amount, 0);
  const landedCost = basePriceKrw + override.customsDuty + additionalCostsTotal;

  return {
    shipmentId,
    basePrice,
    exchangeRate,
    basePriceKrw,
    customsDuty: override.customsDuty,
    additionalCostsTotal,
    additionalCostsBreakdown: override.additionalCosts,
    landedCost,
  };
}

export function listCostOverrides(): CostOverride[] {
  return Array.from(COST_OVERRIDES.values());
}

export function registerCustomsCostTools(server: McpServer): void {
  server.tool(
    "ecount_override_customs_cost",
    "선적 건에 대한 관세 및 추가 비용을 수동으로 입력하여 원가를 재계산합니다.",
    {
      shipmentId: z.string().describe("선적 ID"),
      customsDuty: z.number().nonnegative().describe("관세액 (KRW)"),
      additionalCosts: z.array(
        z.object({
          name: z.string().describe("비용 항목명 (예: 운송비, 보험료, 하역비)"),
          amount: z.number().nonnegative().describe("금액 (KRW)"),
        })
      ).describe("추가 비용 항목 목록"),
      reason: z.string().describe("수동 입력 사유"),
      overriddenBy: z.string().describe("입력자"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (params: Record<string, unknown>) => {
      try {
        const result = addCostOverride({
          shipmentId: params.shipmentId as string,
          customsDuty: params.customsDuty as number,
          additionalCosts: params.additionalCosts as AdditionalCost[],
          reason: params.reason as string,
          overriddenBy: params.overriddenBy as string,
        });
        return formatResponse({ success: true, override: result });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_get_landed_cost",
    "선적 건의 랜디드 코스트(총 원가)를 계산합니다. 관세 및 추가 비용이 먼저 입력되어 있어야 합니다.",
    {
      shipmentId: z.string().describe("선적 ID"),
      basePrice: z.number().positive().describe("기준 가격 (외화)"),
      exchangeRate: z.number().positive().describe("적용 환율 (KRW/외화 단위)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = calculateLandedCost(
          params.shipmentId as string,
          params.basePrice as number,
          params.exchangeRate as number,
        );
        if (!result) {
          return formatResponse({
            found: false,
            message: `선적 ID '${params.shipmentId}'에 대한 비용 오버라이드 정보가 없습니다. 먼저 ecount_override_customs_cost를 실행하세요.`,
          });
        }
        return formatResponse({ found: true, landedCost: result });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
