import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import {
  type PaymentOut,
  type PayableContract,
  paymentOuts,
  payableContracts,
  recordPaymentOut,
  registerPayableContract,
} from "../utils/payable-store.js";
import { computeOutstandingEntries, computeAging, type AgingResult } from "../utils/outstanding-compute.js";

export type { PaymentOut, PayableContract };
export { paymentOuts, payableContracts, recordPaymentOut, registerPayableContract };

export interface PayableEntry {
  contractId: string;
  counterparty: string;
  supplier: string;
  totalAmount: number;
  totalPaid: number;
  outstanding: number;
  currency: string;
  dueDate: string;
  status: "paid" | "partial" | "overdue" | "current";
}

function computePayables(asOfDate?: string): PayableEntry[] {
  return computeOutstandingEntries<PayableContract, PayableEntry>(
    payableContracts.values(),
    paymentOuts.values(),
    asOfDate,
    (c, totalPaid, outstanding, status) => ({
      contractId: c.contractId,
      counterparty: c.supplier,
      supplier: c.supplier,
      totalAmount: c.totalAmount,
      totalPaid,
      outstanding,
      currency: c.currency,
      dueDate: c.dueDate,
      status,
    }),
  );
}

export function listPayables(params: {
  supplier?: string;
  status?: "overdue" | "partial" | "paid" | "all";
  asOfDate?: string;
}): PayableEntry[] {
  let entries = computePayables(params.asOfDate);
  if (params.supplier) entries = entries.filter((e) => e.supplier === params.supplier);
  if (params.status && params.status !== "all") entries = entries.filter((e) => e.status === params.status);
  return entries;
}

export function agingPayables(params: {
  asOfDate?: string;
  warningDays?: number;
}): AgingResult<PayableEntry> {
  const entries = computePayables(params.asOfDate);
  return computeAging(entries, params.asOfDate, 45, params.warningDays);
}

export function registerPayablesTools(server: McpServer): void {
  server.tool(
    "ecount_payable_record_payment_out", "지급 기록을 생성합니다 (선금/중도금/잔금).",
    {
      contractId: z.string(),
      amount: z.number().positive(),
      currency: z.string().describe("통화 코드 (예: KRW, USD)"),
      paymentDate: z.string().describe("지급일 (YYYY-MM-DD)"),
      type: z.enum(["advance", "interim", "final"]).describe("advance: 선금, interim: 중도금, final: 잔금"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (params: Record<string, unknown>) => {
      try {
        const result = recordPaymentOut({
          contractId: params.contractId as string,
          amount: params.amount as number,
          currency: params.currency as string,
          paymentDate: params.paymentDate as string,
          type: params.type as "advance" | "interim" | "final",
        });
        return formatResponse({ success: true, payment: result });
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    "ecount_payable_list_payables", "미지급금 현황을 조회합니다 (공급사별/상태별 필터).",
    {
      supplier: z.string().optional(),
      status: z.enum(["overdue", "partial", "paid", "all"]).optional(),
      asOfDate: z.string().optional().describe("기준일 (YYYY-MM-DD)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = listPayables({
          supplier: params.supplier as string | undefined,
          status: params.status as "overdue" | "partial" | "paid" | "all" | undefined,
          asOfDate: params.asOfDate as string | undefined,
        });
        return formatResponse({ count: result.length, payables: result });
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    "ecount_payable_aging_payables", "미지급금 에이징 분석을 수행합니다 (연령별 구간 분류 및 경고).",
    {
      asOfDate: z.string().optional().describe("기준일 (YYYY-MM-DD)"),
      warningDays: z.number().optional().describe("기본값: 45일"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = agingPayables({
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
