import { MS_PER_DAY } from "./date-helpers.js";
import type { AgingBuckets } from "./aging.js";
import { classifyIntoBuckets } from "./aging.js";

export interface OutstandingEntry {
  contractId: string;
  counterparty: string;
  totalAmount: number;
  totalPaid: number;
  outstanding: number;
  currency: string;
  dueDate: string;
  status: "paid" | "partial" | "overdue" | "current";
}

export interface AgingResult<E extends OutstandingEntry> {
  buckets: AgingBuckets<E>;
  warnings: { contractId: string; counterparty: string; daysOverdue: number; outstanding: number }[];
  totalOutstanding: number;
  warningDays: number;
  asOfDate: string;
}

interface ContractLike {
  contractId: string;
  totalAmount: number;
  currency: string;
  dueDate: string;
}

interface PaymentLike {
  contractId: string;
  amount: number;
}

export function computeOutstandingEntries<
  C extends ContractLike,
  E extends OutstandingEntry,
>(
  contracts: Iterable<C>,
  allPayments: Iterable<PaymentLike>,
  asOfDate: string | undefined,
  mapEntry: (contract: C, totalPaid: number, outstanding: number, status: E["status"]) => E,
): E[] {
  const now = asOfDate ? new Date(asOfDate) : new Date();
  const paymentsByContract = new Map<string, number>();
  for (const p of allPayments) {
    paymentsByContract.set(p.contractId, (paymentsByContract.get(p.contractId) ?? 0) + p.amount);
  }

  const entries: E[] = [];
  for (const contract of contracts) {
    const totalPaid = paymentsByContract.get(contract.contractId) ?? 0;
    const outstanding = contract.totalAmount - totalPaid;

    let status: OutstandingEntry["status"];
    if (outstanding <= 0) {
      status = "paid";
    } else if (totalPaid > 0) {
      status = new Date(contract.dueDate) < now ? "overdue" : "partial";
    } else {
      status = new Date(contract.dueDate) < now ? "overdue" : "current";
    }

    entries.push(mapEntry(contract, totalPaid, Math.max(0, outstanding), status));
  }
  return entries;
}

export function computeAging<E extends OutstandingEntry>(
  entries: E[],
  asOfDate: string | undefined,
  defaultWarningDays: number,
  warningDaysOverride: number | undefined,
): AgingResult<E> {
  const dateStr = asOfDate || new Date().toISOString().slice(0, 10);
  const warningDays = warningDaysOverride ?? defaultWarningDays;
  const now = new Date(dateStr);

  const outstanding = entries.filter((e) => e.outstanding > 0);
  const buckets = classifyIntoBuckets(outstanding, now);

  const warnings: AgingResult<E>["warnings"] = [];
  for (const entry of outstanding) {
    const daysOverdue = Math.floor((now.getTime() - new Date(entry.dueDate).getTime()) / MS_PER_DAY);
    if (daysOverdue >= warningDays) {
      warnings.push({
        contractId: entry.contractId,
        counterparty: entry.counterparty,
        daysOverdue,
        outstanding: entry.outstanding,
      });
    }
  }

  const totalOutstanding = outstanding.reduce((sum, e) => sum + e.outstanding, 0);
  return { buckets, warnings, totalOutstanding, warningDays, asOfDate: dateStr };
}
