import { describe, it, expect } from "vitest";
import { generateDailyReport } from "../../src/tools/daily-report.js";

describe("generateDailyReport", () => {
  it("should produce report structure even with empty data (no shipments/contracts)", () => {
    const report = generateDailyReport();
    expect(report).toContain("일일 업무 리포트");
    expect(report).toContain("═");
  });

  it("should include a date header in the report", () => {
    const date = "2026-03-25";
    const report = generateDailyReport({ date });
    expect(report).toContain(date);
  });

  it("should use today's date when no date is provided", () => {
    const today = new Date().toISOString().slice(0, 10);
    const report = generateDailyReport();
    expect(report).toContain(today);
  });

  it("should include shipment section by default", () => {
    const report = generateDailyReport();
    expect(report).toContain("선적 현황");
  });

  it("should exclude shipment section when includeShipments is false", () => {
    const report = generateDailyReport({ includeShipments: false });
    expect(report).not.toContain("선적 현황");
  });

  it("should include contract section by default", () => {
    const report = generateDailyReport();
    expect(report).toContain("계약 현황");
  });

  it("should exclude contract section when includeContracts is false", () => {
    const report = generateDailyReport({ includeContracts: false });
    expect(report).not.toContain("계약 현황");
  });

  it("should include exchange rate section with USD, BRL, EUR by default", () => {
    const report = generateDailyReport();
    expect(report).toContain("환율 정보");
    expect(report).toContain("USD");
    expect(report).toContain("BRL");
    expect(report).toContain("EUR");
  });

  it("should exclude exchange rate section when includeRates is false", () => {
    const report = generateDailyReport({ includeRates: false });
    expect(report).not.toContain("환율 정보");
  });

  it("should produce a report with all sections when no options provided", () => {
    const report = generateDailyReport();
    expect(report).toContain("선적 현황");
    expect(report).toContain("계약 현황");
    expect(report).toContain("환율 정보");
  });
});

describe("registerDailyReportTools", () => {
  it("should register tools without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerDailyReportTools } = await import("../../src/tools/daily-report.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerDailyReportTools(server)).not.toThrow();
  });
});
