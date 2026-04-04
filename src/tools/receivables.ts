import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import {
  type Payment,
  type ReceivableContract,
  payments,
  receivableContracts,
  recordPayment,
  registerReceivableContract,
} from "../utils/receivable-store.js";
import { computeOutstandingEntries, computeAging, type AgingResult } from "../utils/outstanding-compute.js";

export type { Payment, ReceivableContract };
export { payments, receivableContracts, recordPayment, registerReceivableContract };

export interface ReceivableEntry {
  contractId: string;
  counterparty: string;
  buyer: string;
  totalAmount: number;
  totalPaid: number;
  outstanding: number;
  currency: string;
  dueDate: string;
  status: "paid" | "partial" | "overdue" | "current";
}

function computeReceivables(asOfDate?: string): ReceivableEntry[] {
  return computeOutstandingEntries<ReceivableContract, ReceivableEntry>(
    receivableContracts.values(),
    payments.values(),
    asOfDate,
    (c, totalPaid, outstanding, status) => ({
      contractId: c.contractId,
      counterparty: c.buyer,
      buyer: c.buyer,
      totalAmount: c.totalAmount,
      totalPaid,
      outstanding,
      currency: c.currency,
      dueDate: c.dueDate,
      status,
    }),
  );
}

export function listReceivables(params: {
  buyer?: string;
  status?: "overdue" | "partial" | "paid" | "all";
  asOfDate?: string;
}): ReceivableEntry[] {
  let entries = computeReceivables(params.asOfDate);
  if (params.buyer) entries = entries.filter((e) => e.buyer === params.buyer);
  if (params.status && params.status !== "all") entries = entries.filter((e) => e.status === params.status);
  return entries;
}

export function agingReceivables(params: {
  asOfDate?: string;
  warningDays?: number;
}): AgingResult<ReceivableEntry> {
  const entries = computeReceivables(params.asOfDate);
  return computeAging(entries, params.asOfDate, 30, params.warningDays);
}

export function registerReceivablesTools(server: McpServer): void {
  server.tool(
    "ecount_record_payment", "수금 기록을 생성합니다 (부분수금/완납).",
    {
      contractId: z.string().describe("계약 ID"),
      amount: z.number().positive().describe("수금 금액"),
      currency: z.string().describe("통화 코드 (예: KRW, USD)"),
      paymentDate: z.string().describe("수금일 (YYYY-MM-DD)"),
      method: z.enum(["bank_transfer", "check", "cash"]).optional().describe("수금 방법"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (params: Record<string, unknown>) => {
      try {
        const result = recordPayment({
          contractId: params.contractId as string,
          amount: params.amount as number,
          currency: params.currency as string,
          paymentDate: params.paymentDate as string,
          method: params.method as string | undefined,
        });
        return formatResponse({ success: true, payment: result });
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    "ecount_list_receivables", "미수금 현황을 조회합니다 (거래처별/상태별 필터).",
    {
      buyer: z.string().optional().describe("거래처/고객명 필터"),
      status: z.enum(["overdue", "partial", "paid", "all"]).optional().describe("상태 필터"),
      asOfDate: z.string().optional().describe("기준일 (YYYY-MM-DD)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = listReceivables({
          buyer: params.buyer as string | undefined,
          status: params.status as "overdue" | "partial" | "paid" | "all" | undefined,
          asOfDate: params.asOfDate as string | undefined,
        });
        return formatResponse({ count: result.length, receivables: result });
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    "ecount_aging_receivables", "미수금 에이징 분석을 수행합니다 (연령별 구간 분류 및 D+30일 경고).",
    {
      asOfDate: z.string().optional().describe("기준일 (YYYY-MM-DD)"),
      warningDays: z.number().optional().describe("경고 기준 일수 (기본값: 30일)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = agingReceivables({
          asOfDate: params.asOfDate as string | undefined,
          warningDays: params.warningDays as number | undefined,
        });
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
