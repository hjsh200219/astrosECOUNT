import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface WeightSettlementResult {
  shipmentId: string;
  contractWeight: number;
  actualWeight: number;
  diff: number;
  type: "잡이익" | "잡손실" | "정상";
  amount: number;
  currency: string;
}

export interface WeightSettlementParams {
  shipmentId: string;
  contractWeight: number;
  actualWeight: number;
  unitPrice: number;
  currency: string;
}

export function calcWeightSettlement(params: WeightSettlementParams): WeightSettlementResult {
  const { shipmentId, contractWeight, actualWeight, unitPrice, currency } = params;
  const diff = actualWeight - contractWeight;
  let type: "잡이익" | "잡손실" | "정상";

  if (diff > 0) {
    type = "잡이익";
  } else if (diff < 0) {
    type = "잡손실";
  } else {
    type = "정상";
  }

  const amount = Math.abs(diff) * unitPrice;

  return { shipmentId, contractWeight, actualWeight, diff, type, amount, currency };
}

export function registerWeightSettlementTools(server: McpServer): void {
  server.tool(
    "ecount_weight_calc_weight_settlement",
    "가중량 vs 실중량 차이를 계산하여 잡이익/잡손실을 산출합니다.",
    {
      shipmentId: z.string(),
      contractWeight: z.number().nonnegative().describe("kg"),
      actualWeight: z.number().nonnegative().describe("kg"),
      unitPrice: z.number().positive().describe("단가 (통화 단위)"),
      currency: z.string().describe("통화 코드 (예: KRW, USD)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = calcWeightSettlement({
          shipmentId: params.shipmentId as string,
          contractWeight: params.contractWeight as number,
          actualWeight: params.actualWeight as number,
          unitPrice: params.unitPrice as number,
          currency: params.currency as string,
        });
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
