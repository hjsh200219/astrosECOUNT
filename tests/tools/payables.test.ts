import { describe, it, expect, beforeEach } from "vitest";
import {
  recordPaymentOut,
  listPayables,
  agingPayables,
  paymentOuts,
  payableContracts,
  type PaymentOut,
} from "../../src/tools/payables.js";

beforeEach(() => {
  paymentOuts.clear();
  payableContracts.clear();
});

describe("recordPaymentOut", () => {
  it("should create a payment out record with generated id and timestamp", () => {
    const result = recordPaymentOut({
      contractId: "C-001",
      amount: 5000000,
      currency: "KRW",
      paymentDate: "2026-03-01",
      type: "advance",
    });

    expect(result.id).toBeDefined();
    expect(result.contractId).toBe("C-001");
    expect(result.amount).toBe(5000000);
    expect(result.currency).toBe("KRW");
    expect(result.paymentDate).toBe("2026-03-01");
    expect(result.type).toBe("advance");
    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("should store multiple payments for the same contract", () => {
    recordPaymentOut({ contractId: "C-002", amount: 1000000, currency: "USD", paymentDate: "2026-01-01", type: "advance" });
    recordPaymentOut({ contractId: "C-002", amount: 2000000, currency: "USD", paymentDate: "2026-02-01", type: "interim" });

    const payments = Array.from(paymentOuts.values()).filter((p) => p.contractId === "C-002");
    expect(payments).toHaveLength(2);
  });

  it("should assign unique ids", () => {
    const a = recordPaymentOut({ contractId: "C-003", amount: 100, currency: "KRW", paymentDate: "2026-01-01", type: "final" });
    const b = recordPaymentOut({ contractId: "C-004", amount: 200, currency: "KRW", paymentDate: "2026-01-02", type: "advance" });
    expect(a.id).not.toBe(b.id);
  });
});

describe("listPayables", () => {
  beforeEach(() => {
    // Register contracts
    payableContracts.set("C-010", { contractId: "C-010", supplier: "공급사A", totalAmount: 10000000, currency: "KRW", dueDate: "2026-02-01" });
    payableContracts.set("C-011", { contractId: "C-011", supplier: "공급사B", totalAmount: 5000000, currency: "KRW", dueDate: "2026-04-01" });
    payableContracts.set("C-012", { contractId: "C-012", supplier: "공급사A", totalAmount: 3000000, currency: "KRW", dueDate: "2026-01-15" });
  });

  it("should list all payables with outstanding amounts", () => {
    recordPaymentOut({ contractId: "C-010", amount: 3000000, currency: "KRW", paymentDate: "2026-01-15", type: "advance" });

    const result = listPayables({});
    expect(result.length).toBe(3);
    const c010 = result.find((r) => r.contractId === "C-010");
    expect(c010!.totalPaid).toBe(3000000);
    expect(c010!.outstanding).toBe(7000000);
  });

  it("should filter by supplier", () => {
    const result = listPayables({ supplier: "공급사A" });
    expect(result.length).toBe(2);
    expect(result.every((r) => r.supplier === "공급사A")).toBe(true);
  });

  it("should filter by status (paid)", () => {
    recordPaymentOut({ contractId: "C-011", amount: 5000000, currency: "KRW", paymentDate: "2026-03-01", type: "final" });

    const result = listPayables({ status: "paid" });
    expect(result.length).toBe(1);
    expect(result[0].contractId).toBe("C-011");
    expect(result[0].outstanding).toBe(0);
  });

  it("should filter by status (overdue)", () => {
    const result = listPayables({ status: "overdue", asOfDate: "2026-03-15" });
    // C-010 dueDate 2026-02-01 → overdue, C-012 dueDate 2026-01-15 → overdue
    const contractIds = result.map((r) => r.contractId);
    expect(contractIds).toContain("C-010");
    expect(contractIds).toContain("C-012");
    expect(contractIds).not.toContain("C-011");
  });
});

describe("agingPayables", () => {
  beforeEach(() => {
    payableContracts.set("C-020", { contractId: "C-020", supplier: "공급사X", totalAmount: 1000000, currency: "KRW", dueDate: "2026-03-25" });
    payableContracts.set("C-021", { contractId: "C-021", supplier: "공급사Y", totalAmount: 2000000, currency: "KRW", dueDate: "2026-02-15" });
    payableContracts.set("C-022", { contractId: "C-022", supplier: "공급사Z", totalAmount: 3000000, currency: "KRW", dueDate: "2025-12-01" });
  });

  it("should group payables into age buckets", () => {
    const result = agingPayables({ asOfDate: "2026-03-31" });

    expect(result.buckets).toBeDefined();
    expect(result.buckets.current).toBeDefined();
    expect(result.buckets["1-30"]).toBeDefined();
    expect(result.buckets["31-60"]).toBeDefined();
    expect(result.buckets["61-90"]).toBeDefined();
    expect(result.buckets["90+"]).toBeDefined();
  });

  it("should flag items past warningDays", () => {
    const result = agingPayables({ asOfDate: "2026-03-31", warningDays: 45 });
    // C-022 dueDate 2025-12-01, 120 days overdue → flagged
    expect(result.warnings.length).toBeGreaterThan(0);
    const warningIds = result.warnings.map((w: { contractId: string }) => w.contractId);
    expect(warningIds).toContain("C-022");
  });

  it("should return totalOutstanding sum", () => {
    const result = agingPayables({ asOfDate: "2026-03-31" });
    expect(result.totalOutstanding).toBe(6000000); // 1M + 2M + 3M
  });

  it("should use default warningDays of 45", () => {
    const result = agingPayables({ asOfDate: "2026-03-31" });
    expect(result.warningDays).toBe(45);
  });
});

describe("registerPayablesTools", () => {
  it("should register all 3 tools without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerPayablesTools } = await import("../../src/tools/payables.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerPayablesTools(server)).not.toThrow();
  });
});
