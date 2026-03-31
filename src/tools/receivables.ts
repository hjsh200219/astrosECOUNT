import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface Payment {
  id: string;
  contractId: string;
  amount: number;
  currency: string;
  paymentDate: string;
  method: string;
  createdAt: string;
}

export interface ReceivableContract {
  contractId: string;
  buyer: string;
  totalAmount: number;
  currency: string;
  dueDate: string;
}

export interface ReceivableEntry {
  contractId: string;
  buyer: string;
  totalAmount: number;
  totalPaid: number;
  outstanding: number;
  currency: string;
  dueDate: string;
  status: "paid" | "partial" | "overdue" | "current";
}

export interface AgingBuckets {
  current: ReceivableEntry[];
  "1-30": ReceivableEntry[];
  "31-60": ReceivableEntry[];
  "61-90": ReceivableEntry[];
  "90+": ReceivableEntry[];
}

export interface AgingResult {
  buckets: AgingBuckets;
  warnings: { contractId: string; buyer: string; daysOverdue: number; outstanding: number }[];
  totalOutstanding: number;
  warningDays: number;
  asOfDate: string;
}

export const payments = new Map<string, Payment>();
export const receivableContracts = new Map<string, ReceivableContract>();

let _idCounter = 0;

function generateId(): string {
  return `pay-${Date.now()}-${++_idCounter}`;
}

export function recordPayment(params: {
  contractId: string;
  amount: number;
  currency: string;
  paymentDate: string;
  method?: string;
}): Payment {
  const record: Payment = {
    id: generateId(),
    contractId: params.contractId,
    amount: params.amount,
    currency: params.currency,
    paymentDate: params.paymentDate,
    method: params.method ?? "bank_transfer",
    createdAt: new Date().toISOString(),
  };
  payments.set(record.id, record);
  return record;
}

function computeReceivables(asOfDate?: string): ReceivableEntry[] {
  const entries: ReceivableEntry[] = [];
  const now = asOfDate ? new Date(asOfDate) : new Date();

  for (const contract of receivableContracts.values()) {
    const contractPayments = Array.from(payments.values()).filter(
      (p) => p.contractId === contract.contractId,
    );
    const totalPaid = contractPayments.reduce((sum, p) => sum + p.amount, 0);
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
      buyer: contract.buyer,
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

export function listReceivables(params: {
  buyer?: string;
  status?: "overdue" | "partial" | "paid" | "all";
  asOfDate?: string;
}): ReceivableEntry[] {
  let entries = computeReceivables(params.asOfDate);

  if (params.buyer) {
    entries = entries.filter((e) => e.buyer === params.buyer);
  }
  if (params.status && params.status !== "all") {
    entries = entries.filter((e) => e.status === params.status);
  }

  return entries;
}

export function agingReceivables(params: {
  asOfDate?: string;
  warningDays?: number;
}): AgingResult {
  const asOfDate = params.asOfDate || new Date().toISOString().slice(0, 10);
  const warningDays = params.warningDays ?? 30;
  const now = new Date(asOfDate);

  const entries = computeReceivables(asOfDate).filter((e) => e.outstanding > 0);

  const buckets: AgingBuckets = {
    current: [],
    "1-30": [],
    "31-60": [],
    "61-90": [],
    "90+": [],
  };

  const warnings: { contractId: string; buyer: string; daysOverdue: number; outstanding: number }[] = [];

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
        buyer: entry.buyer,
        daysOverdue,
        outstanding: entry.outstanding,
      });
    }
  }

  const totalOutstanding = entries.reduce((sum, e) => sum + e.outstanding, 0);

  return { buckets, warnings, totalOutstanding, warningDays, asOfDate };
}

export function registerReceivablesTools(server: McpServer): void {
  server.tool(
    "ecount_record_payment",
    "수금 기록을 생성합니다 (부분수금/완납).",
    {
      contractId: z.string().describe("계약 ID"),
      amount: z.number().positive().describe("수금 금액"),
      currency: z.string().describe("통화 코드 (예: KRW, USD)"),
      paymentDate: z.string().describe("수금일 (YYYY-MM-DD)"),
      method: z.enum(["bank_transfer", "check", "cash"]).optional().describe("수금 방법 (bank_transfer: 계좌이체, check: 수표, cash: 현금)"),
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
    }
  );

  server.tool(
    "ecount_list_receivables",
    "미수금 현황을 조회합니다 (거래처별/상태별 필터).",
    {
      buyer: z.string().optional().describe("거래처/고객명 필터"),
      status: z.enum(["overdue", "partial", "paid", "all"]).optional().describe("상태 필터 (overdue: 연체, partial: 부분수금, paid: 완납, all: 전체)"),
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
    }
  );

  server.tool(
    "ecount_aging_receivables",
    "미수금 에이징 분석을 수행합니다 (연령별 구간 분류 및 D+30일 경고).",
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
    }
  );
}
