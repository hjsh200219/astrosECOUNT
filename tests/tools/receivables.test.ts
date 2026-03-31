import { describe, it, expect, beforeEach } from "vitest";
import {
  recordPayment,
  listReceivables,
  agingReceivables,
  payments,
  receivableContracts,
} from "../../src/tools/receivables.js";

beforeEach(() => {
  payments.clear();
  receivableContracts.clear();
});

describe("recordPayment", () => {
  it("should create a payment record with generated id and timestamp", () => {
    const result = recordPayment({
      contractId: "C-001",
      amount: 5000000,
      currency: "KRW",
      paymentDate: "2026-03-01",
      method: "bank_transfer",
    });

    expect(result.id).toBeDefined();
    expect(result.contractId).toBe("C-001");
    expect(result.amount).toBe(5000000);
    expect(result.currency).toBe("KRW");
    expect(result.paymentDate).toBe("2026-03-01");
    expect(result.method).toBe("bank_transfer");
    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("should store multiple payments for the same contract", () => {
    recordPayment({ contractId: "C-002", amount: 1000000, currency: "KRW", paymentDate: "2026-01-01" });
    recordPayment({ contractId: "C-002", amount: 2000000, currency: "KRW", paymentDate: "2026-02-01" });

    const contractPayments = Array.from(payments.values()).filter((p) => p.contractId === "C-002");
    expect(contractPayments).toHaveLength(2);
  });

  it("should assign unique ids", () => {
    const a = recordPayment({ contractId: "C-003", amount: 100, currency: "KRW", paymentDate: "2026-01-01" });
    const b = recordPayment({ contractId: "C-004", amount: 200, currency: "KRW", paymentDate: "2026-01-02" });
    expect(a.id).not.toBe(b.id);
  });

  it("should default method to bank_transfer if not provided", () => {
    const result = recordPayment({ contractId: "C-005", amount: 300, currency: "KRW", paymentDate: "2026-01-01" });
    expect(result.method).toBe("bank_transfer");
  });
});

describe("listReceivables", () => {
  beforeEach(() => {
    receivableContracts.set("C-010", { contractId: "C-010", buyer: "바이어A", totalAmount: 10000000, currency: "KRW", dueDate: "2026-02-01" });
    receivableContracts.set("C-011", { contractId: "C-011", buyer: "바이어B", totalAmount: 5000000, currency: "KRW", dueDate: "2026-04-01" });
    receivableContracts.set("C-012", { contractId: "C-012", buyer: "바이어A", totalAmount: 3000000, currency: "KRW", dueDate: "2026-01-15" });
  });

  it("should list all receivables with outstanding amounts", () => {
    recordPayment({ contractId: "C-010", amount: 3000000, currency: "KRW", paymentDate: "2026-01-15" });

    const result = listReceivables({});
    expect(result.length).toBe(3);
    const c010 = result.find((r) => r.contractId === "C-010");
    expect(c010!.totalPaid).toBe(3000000);
    expect(c010!.outstanding).toBe(7000000);
  });

  it("should filter by buyer", () => {
    const result = listReceivables({ buyer: "바이어A" });
    expect(result.length).toBe(2);
    expect(result.every((r) => r.buyer === "바이어A")).toBe(true);
  });

  it("should filter by status (paid)", () => {
    recordPayment({ contractId: "C-011", amount: 5000000, currency: "KRW", paymentDate: "2026-03-01" });

    const result = listReceivables({ status: "paid" });
    expect(result.length).toBe(1);
    expect(result[0].contractId).toBe("C-011");
    expect(result[0].outstanding).toBe(0);
  });

  it("should filter by status (overdue)", () => {
    const result = listReceivables({ status: "overdue", asOfDate: "2026-03-15" });
    const contractIds = result.map((r) => r.contractId);
    expect(contractIds).toContain("C-010");
    expect(contractIds).toContain("C-012");
    expect(contractIds).not.toContain("C-011");
  });
});

describe("agingReceivables", () => {
  beforeEach(() => {
    receivableContracts.set("C-020", { contractId: "C-020", buyer: "바이어X", totalAmount: 1000000, currency: "KRW", dueDate: "2026-03-25" });
    receivableContracts.set("C-021", { contractId: "C-021", buyer: "바이어Y", totalAmount: 2000000, currency: "KRW", dueDate: "2026-02-15" });
    receivableContracts.set("C-022", { contractId: "C-022", buyer: "바이어Z", totalAmount: 3000000, currency: "KRW", dueDate: "2025-12-01" });
  });

  it("should group receivables into age buckets", () => {
    const result = agingReceivables({ asOfDate: "2026-03-31" });

    expect(result.buckets).toBeDefined();
    expect(result.buckets.current).toBeDefined();
    expect(result.buckets["1-30"]).toBeDefined();
    expect(result.buckets["31-60"]).toBeDefined();
    expect(result.buckets["61-90"]).toBeDefined();
    expect(result.buckets["90+"]).toBeDefined();
  });

  it("should flag items past warningDays", () => {
    const result = agingReceivables({ asOfDate: "2026-03-31", warningDays: 30 });
    expect(result.warnings.length).toBeGreaterThan(0);
    const warningIds = result.warnings.map((w: { contractId: string }) => w.contractId);
    expect(warningIds).toContain("C-021");
    expect(warningIds).toContain("C-022");
  });

  it("should return totalOutstanding sum", () => {
    const result = agingReceivables({ asOfDate: "2026-03-31" });
    expect(result.totalOutstanding).toBe(6000000);
  });

  it("should use default warningDays of 30", () => {
    const result = agingReceivables({ asOfDate: "2026-03-31" });
    expect(result.warningDays).toBe(30);
  });
});

describe("registerReceivablesTools", () => {
  it("should register all 3 tools without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerReceivablesTools } = await import("../../src/tools/receivables.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerReceivablesTools(server)).not.toThrow();
  });
});
