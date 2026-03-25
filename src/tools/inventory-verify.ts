import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface InventoryStage {
  stage: string;
  product: string;
  quantity: number;
  warehouse?: string;
}

export interface Discrepancy {
  product: string;
  issue: string;
  detail: string;
}

export interface VerificationResult {
  totalQuantity: number;
  byStage: Record<string, number>;
  discrepancies: Discrepancy[];
  isConsistent: boolean;
}

const PRIOR_STAGES = ["미착", "미통관"];

export function verifyInventory(stages: InventoryStage[]): VerificationResult {
  const byStage: Record<string, number> = {};
  const discrepancies: Discrepancy[] = [];

  // Aggregate quantity by stage
  for (const entry of stages) {
    byStage[entry.stage] = (byStage[entry.stage] ?? 0) + entry.quantity;
  }

  const totalQuantity = Object.values(byStage).reduce((sum, q) => sum + q, 0);

  // Collect product sets per stage
  const productsByStage: Record<string, Set<string>> = {};
  for (const entry of stages) {
    if (!productsByStage[entry.stage]) {
      productsByStage[entry.stage] = new Set();
    }
    productsByStage[entry.stage].add(entry.product);
  }

  // Check each entry for issues
  const checkedProducts = new Set<string>();
  for (const entry of stages) {
    // Flag negative or zero quantity
    if (entry.quantity <= 0) {
      const issueType = entry.quantity < 0 ? "음수 수량" : "0 수량";
      discrepancies.push({
        product: entry.product,
        issue: `${issueType} 감지`,
        detail: `단계 '${entry.stage}'의 품목 '${entry.product}' 수량이 ${entry.quantity}입니다.`,
      });
    }

    // Flag product in 상품 stage without prior stage presence
    if (entry.stage === "상품" && !checkedProducts.has(entry.product)) {
      checkedProducts.add(entry.product);
      const existsInPrior = PRIOR_STAGES.some(
        (s) => productsByStage[s]?.has(entry.product)
      );
      if (!existsInPrior) {
        discrepancies.push({
          product: entry.product,
          issue: "이전 단계 누락",
          detail: `품목 '${entry.product}'이 '상품' 단계에만 존재하고 이전 단계(미착/미통관)에 없습니다. 데이터 입력 오류일 수 있습니다.`,
        });
      }
    }
  }

  return {
    totalQuantity,
    byStage,
    discrepancies,
    isConsistent: discrepancies.length === 0,
  };
}

export function registerInventoryVerifyTools(server: McpServer): void {
  server.tool(
    "ecount_verify_inventory",
    "재고 3단계(미착/미통관/상품) 데이터의 정합성을 교차 검증합니다.",
    {
      stages: z
        .array(
          z.object({
            stage: z.string().describe("재고 단계 (미착/미통관/상품)"),
            product: z.string().describe("품목명"),
            quantity: z.number().describe("수량"),
            warehouse: z.string().optional().describe("창고코드"),
          })
        )
        .describe("검증할 재고 단계 데이터 목록"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const stages = params.stages as InventoryStage[];
        const result = verifyInventory(stages);
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
