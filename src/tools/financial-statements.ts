// @layer aggregation
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { payments, receivableContracts } from "./receivables.js";
import { paymentOuts, payableContracts } from "./payables.js";
import { transitions } from "./inventory-lifecycle.js";

export { receivableContracts, payableContracts };

export interface SubuibuResult {
  period: string;
  기초미착품: number;
  당기입고: number;
  기말미착품: number;
  상품재고: number;
  매출원가: number;
}

export interface PnlResult {
  periodFrom: string;
  periodTo: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  sgaExpenses: number;
  financialExpenses: number;
  operatingProfit: number;
}

export interface CashflowResult {
  advancePayments: number;
  onTimePayments: number;
  overdueReceivables: number;
  outstandingPayables: number;
  asOfDate: string;
}

function isInPeriod(timestamp: string, period: string): boolean {
  return timestamp.startsWith(period);
}

function isBeforePeriod(timestamp: string, period: string): boolean {
  return timestamp < period;
}

export function generateSubuibu(params: {
  period: string;
  products?: string[];
}): SubuibuResult {
  const { period, products } = params;
  const allTransitions = Array.from(transitions.values());

  let filtered = allTransitions;
  if (products && products.length > 0) {
    filtered = filtered.filter((t) => products.includes(t.product));
  }

  // 기초미착품: items in 미착 stage at period start (transitions to 미착 before period, not yet transitioned out)
  const beforePeriod = filtered.filter((t) => isBeforePeriod(t.timestamp, period));
  const inPeriod = filtered.filter((t) => isInPeriod(t.timestamp, period));

  // Count items that entered 미착 before period
  const enteredMichak = beforePeriod.filter((t) => t.toStage === "미착").reduce((sum, t) => sum + t.quantity, 0);
  const leftMichakBefore = beforePeriod.filter((t) => t.fromStage === "미착").reduce((sum, t) => sum + t.quantity, 0);
  const 기초미착품 = Math.max(0, enteredMichak - leftMichakBefore);

  // 당기입고: transitions to 상품 during period (도착→상품)
  const 당기입고 = inPeriod.filter((t) => t.toStage === "상품").reduce((sum, t) => sum + t.quantity, 0);

  // 기말미착품: items in 미착 stage at period end
  const allUpToPeriodEnd = filtered.filter(
    (t) => isBeforePeriod(t.timestamp, period) || isInPeriod(t.timestamp, period),
  );
  const totalEnteredMichak = allUpToPeriodEnd.filter((t) => t.toStage === "미착").reduce((sum, t) => sum + t.quantity, 0);
  const totalLeftMichak = allUpToPeriodEnd.filter((t) => t.fromStage === "미착").reduce((sum, t) => sum + t.quantity, 0);
  const 기말미착품 = Math.max(0, totalEnteredMichak - totalLeftMichak);

  // 상품재고: items currently in 상품 stage at period end
  const totalEnteredSangpum = allUpToPeriodEnd.filter((t) => t.toStage === "상품").reduce((sum, t) => sum + t.quantity, 0);
  const totalLeftSangpum = allUpToPeriodEnd.filter((t) => t.fromStage === "상품").reduce((sum, t) => sum + t.quantity, 0);
  const 상품재고 = Math.max(0, totalEnteredSangpum - totalLeftSangpum);

  // 매출원가: transitions to 판매완료 during period (상품→판매완료)
  const 매출원가 = inPeriod.filter((t) => t.toStage === "판매완료").reduce((sum, t) => sum + t.quantity, 0);

  return { period, 기초미착품, 당기입고, 기말미착품, 상품재고, 매출원가 };
}

export function generatePnl(params: {
  periodFrom: string;
  periodTo: string;
  revenue: number;
  sgaExpenses?: number;
  financialExpenses?: number;
}): PnlResult {
  const { periodFrom, periodTo, revenue } = params;
  const sgaExpenses = params.sgaExpenses ?? 0;
  const financialExpenses = params.financialExpenses ?? 0;

  // COGS from transitions: 상품→판매완료 in period
  const allTransitions = Array.from(transitions.values());
  const cogs = allTransitions
    .filter((t) => t.toStage === "판매완료" && t.timestamp >= periodFrom && t.timestamp <= periodTo + "T23:59:59Z")
    .reduce((sum, t) => sum + t.quantity, 0);

  const grossProfit = revenue - cogs;
  const operatingProfit = grossProfit - sgaExpenses - financialExpenses;

  return { periodFrom, periodTo, revenue, cogs, grossProfit, sgaExpenses, financialExpenses, operatingProfit };
}

export function analyzeCashflow(params: { asOfDate?: string }): CashflowResult {
  const asOfDate = params.asOfDate || new Date().toISOString().slice(0, 10);
  const now = new Date(asOfDate);

  // Advance payments: paymentOuts with type 'advance'
  const advancePayments = Array.from(paymentOuts.values())
    .filter((p) => p.type === "advance")
    .reduce((sum, p) => sum + p.amount, 0);

  // On-time payments: receivable payments made before due date
  let onTimePayments = 0;
  for (const payment of payments.values()) {
    const contract = receivableContracts.get(payment.contractId);
    if (contract && new Date(payment.paymentDate) <= new Date(contract.dueDate)) {
      onTimePayments += payment.amount;
    }
  }

  // Overdue receivables: contracts past due with outstanding balance
  let overdueReceivables = 0;
  for (const contract of receivableContracts.values()) {
    if (new Date(contract.dueDate) < now) {
      const paid = Array.from(payments.values())
        .filter((p) => p.contractId === contract.contractId)
        .reduce((sum, p) => sum + p.amount, 0);
      const outstanding = contract.totalAmount - paid;
      if (outstanding > 0) {
        overdueReceivables += outstanding;
      }
    }
  }

  // Outstanding payables: total unpaid across all payable contracts
  let outstandingPayables = 0;
  for (const contract of payableContracts.values()) {
    const paid = Array.from(paymentOuts.values())
      .filter((p) => p.contractId === contract.contractId)
      .reduce((sum, p) => sum + p.amount, 0);
    const outstanding = contract.totalAmount - paid;
    if (outstanding > 0) {
      outstandingPayables += outstanding;
    }
  }

  return { advancePayments, onTimePayments, overdueReceivables, outstandingPayables, asOfDate };
}

export function registerFinancialStatementsTools(server: McpServer): void {
  server.tool(
    "ecount_generate_subuibu",
    "수불부를 자동 생성합니다 (기초미착품/입고/기말미착품/상품재고/매출원가).",
    {
      period: z.string().describe("대상 기간 (YYYY-MM 형식)"),
      products: z.array(z.string()).optional().describe("품목 필터 (비워두면 전체)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = generateSubuibu({
          period: params.period as string,
          products: params.products as string[] | undefined,
        });
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_generate_pnl",
    "손익계산서를 생성합니다 (매출/매출원가/판관비/금융비/영업이익).",
    {
      periodFrom: z.string().describe("시작일 (YYYY-MM-DD)"),
      periodTo: z.string().describe("종료일 (YYYY-MM-DD)"),
      revenue: z.number().nonnegative().describe("매출액 (AI 에이전트가 ECOUNT 매출전표에서 산출)"),
      sgaExpenses: z.number().nonnegative().optional().describe("판관비 (기본값: 0)"),
      financialExpenses: z.number().nonnegative().optional().describe("금융비용 (기본값: 0)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = generatePnl({
          periodFrom: params.periodFrom as string,
          periodTo: params.periodTo as string,
          revenue: params.revenue as number,
          sgaExpenses: params.sgaExpenses as number | undefined,
          financialExpenses: params.financialExpenses as number | undefined,
        });
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_analyze_cashflow",
    "현금흐름을 분석합니다 (선금/기한내수금/연체미수금/미지급금).",
    {
      asOfDate: z.string().optional().describe("기준일 (YYYY-MM-DD)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = analyzeCashflow({
          asOfDate: params.asOfDate as string | undefined,
        });
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
