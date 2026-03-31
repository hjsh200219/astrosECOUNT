import { describe, it, expect, beforeEach } from "vitest";
import {
  generateSubuibu,
  generatePnl,
  analyzeCashflow,
  receivableContracts as fsReceivableContracts,
  payableContracts as fsPayableContracts,
} from "../../src/tools/financial-statements.js";
import { payments, receivableContracts } from "../../src/tools/receivables.js";
import { paymentOuts, payableContracts } from "../../src/tools/payables.js";
import { transitions } from "../../src/tools/inventory-lifecycle.js";

beforeEach(() => {
  payments.clear();
  receivableContracts.clear();
  paymentOuts.clear();
  payableContracts.clear();
  transitions.clear();
});

describe("generateSubuibu", () => {
  it("should generate 수불부 with correct structure", () => {
    const result = generateSubuibu({ period: "2026-03" });

    expect(result.period).toBe("2026-03");
    expect(result).toHaveProperty("기초미착품");
    expect(result).toHaveProperty("당기입고");
    expect(result).toHaveProperty("기말미착품");
    expect(result).toHaveProperty("상품재고");
    expect(result).toHaveProperty("매출원가");
  });

  it("should count transitions correctly by period", () => {
    // Add transitions in March 2026
    transitions.set("t1", {
      id: "t1", shipmentId: "S-1", product: "한우채끝",
      fromStage: "미착", toStage: "도착", quantity: 500,
      timestamp: "2026-03-05T00:00:00Z",
    });
    transitions.set("t2", {
      id: "t2", shipmentId: "S-1", product: "한우채끝",
      fromStage: "도착", toStage: "상품", quantity: 500,
      timestamp: "2026-03-10T00:00:00Z",
    });
    transitions.set("t3", {
      id: "t3", shipmentId: "S-2", product: "호주산등심",
      fromStage: "상품", toStage: "판매완료", quantity: 300,
      timestamp: "2026-03-15T00:00:00Z",
    });

    const result = generateSubuibu({ period: "2026-03" });

    expect(result.당기입고).toBe(500); // 도착→상품 in March
    expect(result.매출원가).toBe(300); // 상품→판매완료 in March
  });

  it("should filter by product if specified", () => {
    transitions.set("t1", {
      id: "t1", shipmentId: "S-1", product: "한우채끝",
      fromStage: "도착", toStage: "상품", quantity: 500,
      timestamp: "2026-03-10T00:00:00Z",
    });
    transitions.set("t2", {
      id: "t2", shipmentId: "S-2", product: "호주산등심",
      fromStage: "도착", toStage: "상품", quantity: 300,
      timestamp: "2026-03-12T00:00:00Z",
    });

    const result = generateSubuibu({ period: "2026-03", products: ["한우채끝"] });
    expect(result.당기입고).toBe(500);
  });
});

describe("generatePnl", () => {
  it("should generate P&L with correct structure", () => {
    const result = generatePnl({
      periodFrom: "2026-01-01",
      periodTo: "2026-03-31",
      revenue: 50000000,
    });

    expect(result).toHaveProperty("revenue");
    expect(result).toHaveProperty("cogs");
    expect(result).toHaveProperty("grossProfit");
    expect(result).toHaveProperty("sgaExpenses");
    expect(result).toHaveProperty("financialExpenses");
    expect(result).toHaveProperty("operatingProfit");
    expect(result.revenue).toBe(50000000);
  });

  it("should compute profits correctly", () => {
    // Add a 판매완료 transition for COGS
    transitions.set("t-pnl", {
      id: "t-pnl", shipmentId: "S-PNL", product: "한우채끝",
      fromStage: "상품", toStage: "판매완료", quantity: 100,
      timestamp: "2026-02-15T00:00:00Z",
    });

    const result = generatePnl({
      periodFrom: "2026-01-01",
      periodTo: "2026-03-31",
      revenue: 50000000,
      sgaExpenses: 5000000,
      financialExpenses: 1000000,
    });

    expect(result.grossProfit).toBe(result.revenue - result.cogs);
    expect(result.operatingProfit).toBe(result.grossProfit - 5000000 - 1000000);
  });

  it("should default SGA and financial expenses to 0", () => {
    const result = generatePnl({
      periodFrom: "2026-01-01",
      periodTo: "2026-03-31",
      revenue: 10000000,
    });

    expect(result.sgaExpenses).toBe(0);
    expect(result.financialExpenses).toBe(0);
    expect(result.operatingProfit).toBe(result.grossProfit);
  });
});

describe("analyzeCashflow", () => {
  beforeEach(() => {
    // Setup contracts for both receivables and payables
    receivableContracts.set("RC-1", { contractId: "RC-1", buyer: "바이어A", totalAmount: 10000000, currency: "KRW", dueDate: "2026-02-01" });
    payableContracts.set("PC-1", { contractId: "PC-1", supplier: "공급사A", totalAmount: 5000000, currency: "KRW", dueDate: "2026-02-15" });
  });

  it("should return cashflow analysis structure", () => {
    const result = analyzeCashflow({ asOfDate: "2026-03-31" });

    expect(result).toHaveProperty("advancePayments");
    expect(result).toHaveProperty("onTimePayments");
    expect(result).toHaveProperty("overdueReceivables");
    expect(result).toHaveProperty("outstandingPayables");
    expect(result).toHaveProperty("asOfDate");
  });

  it("should categorize payments correctly", () => {
    // Add an on-time payment (before due date)
    payments.set("p1", {
      id: "p1", contractId: "RC-1", amount: 5000000, currency: "KRW",
      paymentDate: "2026-01-15", method: "bank_transfer", createdAt: "2026-01-15T00:00:00Z",
    });

    // Add an advance payment out
    paymentOuts.set("po1", {
      id: "po1", contractId: "PC-1", amount: 1000000, currency: "KRW",
      paymentDate: "2026-01-01", type: "advance", createdAt: "2026-01-01T00:00:00Z",
    });

    const result = analyzeCashflow({ asOfDate: "2026-03-31" });

    expect(result.onTimePayments).toBeGreaterThan(0);
    expect(result.advancePayments).toBeGreaterThan(0);
  });

  it("should calculate overdue receivables", () => {
    // RC-1 due 2026-02-01, no payments → overdue as of 2026-03-31
    const result = analyzeCashflow({ asOfDate: "2026-03-31" });

    expect(result.overdueReceivables).toBe(10000000);
  });

  it("should calculate outstanding payables", () => {
    // PC-1 total 5M, no payments out → outstanding
    const result = analyzeCashflow({ asOfDate: "2026-03-31" });

    expect(result.outstandingPayables).toBe(5000000);
  });
});

describe("registerFinancialStatementsTools", () => {
  it("should register all 3 tools without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerFinancialStatementsTools } = await import("../../src/tools/financial-statements.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerFinancialStatementsTools(server)).not.toThrow();
  });
});
