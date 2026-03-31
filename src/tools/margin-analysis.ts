// @layer aggregation
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface MarginContract {
  contractId: string;
  product: string;
  buyer: string;
  costAmount: number;
  currency: string;
  contractDate: string;
}

export interface MarginSale {
  salesId: string;
  contractId: string;
  product: string;
  revenueAmount: number;
  currency: string;
  salesDate: string;
}

export interface MarginItem {
  contractId?: string;
  product?: string;
  revenue: number;
  cost: number;
  margin: number;
  marginRate: number;
}

export interface MarginResult {
  groupBy: "contract" | "product";
  items: MarginItem[];
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalMargin: number;
    avgMarginRate: number;
  };
}

export const marginContracts = new Map<string, MarginContract>();
export const marginSales = new Map<string, MarginSale>();

export function analyzeMargin(params: {
  groupBy: "contract" | "product";
  periodFrom?: string;
  periodTo?: string;
}): MarginResult {
  const { groupBy, periodFrom, periodTo } = params;

  let sales = Array.from(marginSales.values());

  // Filter by period if specified
  if (periodFrom) {
    sales = sales.filter((s) => s.salesDate >= periodFrom);
  }
  if (periodTo) {
    sales = sales.filter((s) => s.salesDate <= periodTo);
  }

  const items: MarginItem[] = [];

  if (groupBy === "contract") {
    // Group by contractId
    const contractIds = [...new Set(sales.map((s) => s.contractId))];

    for (const contractId of contractIds) {
      const contractSales = sales.filter((s) => s.contractId === contractId);
      const contract = marginContracts.get(contractId);

      const revenue = contractSales.reduce((sum, s) => sum + s.revenueAmount, 0);
      const cost = contract?.costAmount ?? 0;
      const margin = revenue - cost;
      const marginRate = revenue > 0 ? (margin / revenue) * 100 : 0;

      items.push({ contractId, product: contract?.product, revenue, cost, margin, marginRate });
    }
  } else {
    // Group by product
    const products = [...new Set(sales.map((s) => s.product))];

    for (const product of products) {
      const productSales = sales.filter((s) => s.product === product);
      const productContractIds = [...new Set(productSales.map((s) => s.contractId))];

      const revenue = productSales.reduce((sum, s) => sum + s.revenueAmount, 0);
      const cost = productContractIds.reduce((sum, cid) => {
        const contract = marginContracts.get(cid);
        return sum + (contract?.costAmount ?? 0);
      }, 0);
      const margin = revenue - cost;
      const marginRate = revenue > 0 ? (margin / revenue) * 100 : 0;

      items.push({ product, revenue, cost, margin, marginRate });
    }
  }

  // Sort by margin descending
  items.sort((a, b) => b.margin - a.margin);

  const totalRevenue = items.reduce((sum, i) => sum + i.revenue, 0);
  const totalCost = items.reduce((sum, i) => sum + i.cost, 0);
  const totalMargin = totalRevenue - totalCost;
  const avgMarginRate = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  return {
    groupBy,
    items,
    summary: { totalRevenue, totalCost, totalMargin, avgMarginRate },
  };
}

export function registerMarginAnalysisTools(server: McpServer): void {
  server.tool(
    "ecount_analyze_margin",
    "계약별 또는 품목별 마진을 분석합니다 (매출-원가-마진율 산출).",
    {
      groupBy: z.enum(["contract", "product"]).describe("그룹 기준 (contract: 계약별, product: 품목별)"),
      periodFrom: z.string().optional().describe("시작일 필터 (YYYY-MM-DD)"),
      periodTo: z.string().optional().describe("종료일 필터 (YYYY-MM-DD)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = analyzeMargin({
          groupBy: params.groupBy as "contract" | "product",
          periodFrom: params.periodFrom as string | undefined,
          periodTo: params.periodTo as string | undefined,
        });
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
