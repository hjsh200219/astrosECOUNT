import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface PaymentOut {
  id: string;
  contractId: string;
  amount: number;
  currency: string;
  paymentDate: string;
  type: "advance" | "interim" | "final";
  createdAt: string;
}

export interface PayableContract {
  contractId: string;
  supplier: string;
  totalAmount: number;
  currency: string;
  dueDate: string;
}

export interface PayableEntry {
  contractId: string;
  supplier: string;
  totalAmount: number;
  totalPaid: number;
  outstanding: number;
  currency: string;
  dueDate: string;
  status: "paid" | "partial" | "overdue" | "current";
}

export interface AgingBuckets {
  current: PayableEntry[];
  "1-30": PayableEntry[];
  "31-60": PayableEntry[];
  "61-90": PayableEntry[];
  "90+": PayableEntry[];
}

export interface AgingResult {
  buckets: AgingBuckets;
  warnings: { contractId: string; supplier: string; daysOverdue: number; outstanding: number }[];
  totalOutstanding: number;
  warningDays: number;
  asOfDate: string;
}

export const paymentOuts = new Map<string, PaymentOut>();
export const payableContracts = new Map<string, PayableContract>();

let _idCounter = 0;

function generateId(): string {
  return `po-${Date.now()}-${++_idCounter}`;
}

export function recordPaymentOut(params: {
  contractId: string;
  amount: number;
  currency: string;
  paymentDate: string;
  type: "advance" | "interim" | "final";
}): PaymentOut {
  const record: PaymentOut = {
    id: generateId(),
    ...params,
    createdAt: new Date().toISOString(),
  };
  paymentOuts.set(record.id, record);
  return record;
}

function computePayables(asOfDate?: string): PayableEntry[] {
  const entries: PayableEntry[] = [];
  const now = asOfDate ? new Date(asOfDate) : new Date();

  for (const contract of payableContracts.values()) {
    const payments = Array.from(paymentOuts.values()).filter(
      (p) => p.contractId === contract.contractId,
    );
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = contract.totalAmount - totalPaid;

    let status: "paid" | "partial" | "overdue" | "current";
    if (outstanding <= 0) {
      status = "paid";
    } else if (totalPaid > 0) {
      status = new Date(contract.dueDate) < now ? "overdue" : "partial";
    } else {
      status = new Date(contract.dueDate) < now ? "overdue" : "current";
    }

    entries.push({
      contractId: contract.contractId,
      supplier: contract.supplier,
      totalAmount: contract.totalAmount,
      totalPaid,
      outstanding: Math.max(0, outstanding),
      currency: contract.currency,
      dueDate: contract.dueDate,
      status,
    });
  }
  return entries;
}

export function listPayables(params: {
  supplier?: string;
  status?: "overdue" | "partial" | "paid" | "all";
  asOfDate?: string;
}): PayableEntry[] {
  let entries = computePayables(params.asOfDate);

  if (params.supplier) {
    entries = entries.filter((e) => e.supplier === params.supplier);
  }
  if (params.status && params.status !== "all") {
    entries = entries.filter((e) => e.status === params.status);
  }

  return entries;
}

export function agingPayables(params: {
  asOfDate?: string;
  warningDays?: number;
}): AgingResult {
  const asOfDate = params.asOfDate || new Date().toISOString().slice(0, 10);
  const warningDays = params.warningDays ?? 45;
  const now = new Date(asOfDate);

  const entries = computePayables(asOfDate).filter((e) => e.outstanding > 0);

  const buckets: AgingBuckets = {
    current: [],
    "1-30": [],
    "31-60": [],
    "61-90": [],
    "90+": [],
  };

  const warnings: { contractId: string; supplier: string; daysOverdue: number; outstanding: number }[] = [];

  for (const entry of entries) {
    const dueDate = new Date(entry.dueDate);
    const diffMs = now.getTime() - dueDate.getTime();
    const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (daysOverdue <= 0) {
      buckets.current.push(entry);
    } else if (daysOverdue <= 30) {
      buckets["1-30"].push(entry);
    } else if (daysOverdue <= 60) {
      buckets["31-60"].push(entry);
    } else if (daysOverdue <= 90) {
      buckets["61-90"].push(entry);
    } else {
      buckets["90+"].push(entry);
    }

    if (daysOverdue >= warningDays) {
      warnings.push({
        contractId: entry.contractId,
        supplier: entry.supplier,
        daysOverdue,
        outstanding: entry.outstanding,
      });
    }
  }

  const totalOutstanding = entries.reduce((sum, e) => sum + e.outstanding, 0);

  return { buckets, warnings, totalOutstanding, warningDays, asOfDate };
}

export function registerPayablesTools(server: McpServer): void {
  server.tool(
    "ecount_record_payment_out",
    "지급 기록을 생성합니다 (선금/중도금/잔금).",
    {
      contractId: z.string().describe("계약 ID"),
      amount: z.number().positive().describe("지급 금액"),
      currency: z.string().describe("통화 코드 (예: KRW, USD)"),
      paymentDate: z.string().describe("지급일 (YYYY-MM-DD)"),
      type: z.enum(["advance", "interim", "final"]).describe("지급 유형 (advance: 선금, interim: 중도금, final: 잔금)"),
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
    }
  );

  server.tool(
    "ecount_list_payables",
    "미지급금 현황을 조회합니다 (공급사별/상태별 필터).",
    {
      supplier: z.string().optional().describe("공급사명 필터"),
      status: z.enum(["overdue", "partial", "paid", "all"]).optional().describe("상태 필터 (overdue: 연체, partial: 부분지급, paid: 완납, all: 전체)"),
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
    }
  );

  server.tool(
    "ecount_aging_payables",
    "미지급금 에이징 분석을 수행합니다 (연령별 구간 분류 및 경고).",
    {
      asOfDate: z.string().optional().describe("기준일 (YYYY-MM-DD)"),
      warningDays: z.number().optional().describe("경고 기준 일수 (기본값: 45일)"),
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
    }
  );
}
