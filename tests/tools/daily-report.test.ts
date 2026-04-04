import { describe, it, expect } from "vitest";
import { generateDailyReport, generateDiagnosticReport } from "../../src/tools/daily-report.js";
import { addShipment } from "../../src/tools/shipment-tracking.js";

describe("generateDailyReport", () => {
  it("should produce report structure even with empty data (no shipments/contracts)", async () => {
    const report = await generateDailyReport();
    expect(report).toContain("일일 업무 리포트");
    expect(report).toContain("═");
  });

  it("should include a date header in the report", async () => {
    const date = "2026-03-25";
    const report = await generateDailyReport({ date });
    expect(report).toContain(date);
  });

  it("should use today's date when no date is provided", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const report = await generateDailyReport();
    expect(report).toContain(today);
  });

  it("should include shipment section by default", async () => {
    const report = await generateDailyReport();
    expect(report).toContain("선적 현황");
  });

  it("should exclude shipment section when includeShipments is false", async () => {
    const report = await generateDailyReport({ includeShipments: false });
    expect(report).not.toContain("선적 현황");
  });

  it("should include contract section by default", async () => {
    const report = await generateDailyReport();
    expect(report).toContain("계약 현황");
  });

  it("should exclude contract section when includeContracts is false", async () => {
    const report = await generateDailyReport({ includeContracts: false });
    expect(report).not.toContain("계약 현황");
  });

  it("should produce a report with all sections when no options provided", async () => {
    const report = await generateDailyReport();
    expect(report).toContain("선적 현황");
    expect(report).toContain("계약 현황");
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

describe("generateDiagnosticReport", () => {
  it("should return correct DiagnosticReport structure", async () => {
    const report = await generateDiagnosticReport();
    expect(report).toHaveProperty("date");
    expect(report).toHaveProperty("diagnostics");
    expect(Array.isArray(report.diagnostics)).toBe(true);
    expect(report).toHaveProperty("passCount");
    expect(report).toHaveProperty("warningCount");
    expect(report).toHaveProperty("failCount");
    expect(report).toHaveProperty("overallHealth");
    expect(["healthy", "attention", "critical"]).toContain(report.overallHealth);
  });

  it("should use provided date in the report", async () => {
    const report = await generateDiagnosticReport("2026-03-27");
    expect(report.date).toBe("2026-03-27");
  });

  it("L1 shipments check returns warning when no shipments", async () => {
    const report = await generateDiagnosticReport();
    const shipmentCheck = report.diagnostics.find(
      (d) => d.level === "L1" && d.category === "shipments"
    );
    expect(shipmentCheck).toBeDefined();
    expect(shipmentCheck?.status).toBe("warning");
  });

  it("L2 stale shipment detection returns pass or warning", async () => {
    addShipment({
      blNumber: "TEST-STALE-001",
      carrier: "TestCarrier",
      product: "TestProduct",
      origin: "Origin",
      destination: "Destination",
      status: "in_transit",
    });
    const report = await generateDiagnosticReport();
    const staleCheck = report.diagnostics.find(
      (d) => d.level === "L2" && d.category === "stale_shipments"
    );
    expect(staleCheck).toBeDefined();
    expect(["pass", "warning"]).toContain(staleCheck?.status);
  });

  it("L3 customs stuck check: no shipments stuck in customs returns pass", async () => {
    const report = await generateDiagnosticReport();
    const customsCheck = report.diagnostics.find(
      (d) => d.level === "L3" && d.category === "customs_stuck"
    );
    expect(customsCheck).toBeDefined();
    expect(customsCheck?.status).toBe("pass");
  });

  it("L3 arrived stuck check: no shipments stuck in arrived returns pass", async () => {
    const report = await generateDiagnosticReport();
    const arrivedCheck = report.diagnostics.find(
      (d) => d.level === "L3" && d.category === "arrived_stuck"
    );
    expect(arrivedCheck).toBeDefined();
    expect(arrivedCheck?.status).toBe("pass");
  });

  it("overall health is consistent with counts", async () => {
    const report = await generateDiagnosticReport();
    if (report.failCount > 0) {
      expect(report.overallHealth).toBe("critical");
    } else if (report.warningCount > 0) {
      expect(report.overallHealth).toBe("attention");
    } else {
      expect(report.overallHealth).toBe("healthy");
    }
  });

  it("passCount + warningCount + failCount equals total diagnostics length", async () => {
    const report = await generateDiagnosticReport();
    expect(report.passCount + report.warningCount + report.failCount).toBe(report.diagnostics.length);
  });

  it("each diagnostic item has required fields with correct types", async () => {
    const report = await generateDiagnosticReport();
    for (const item of report.diagnostics) {
      expect(["L1", "L2", "L3"]).toContain(item.level);
      expect(typeof item.category).toBe("string");
      expect(["pass", "warning", "fail"]).toContain(item.status);
      expect(typeof item.message).toBe("string");
    }
  });
});

describe("generateDailyReport with diagnostics", () => {
  it("should include diagnostics section by default", async () => {
    const report = await generateDailyReport();
    expect(report).toContain("자가진단");
  });

  it("should include diagnostics section when includeDiagnostics is true", async () => {
    const report = await generateDailyReport({ includeDiagnostics: true });
    expect(report).toContain("자가진단");
  });

  it("should exclude diagnostics section when includeDiagnostics is false", async () => {
    const report = await generateDailyReport({ includeDiagnostics: false });
    expect(report).not.toContain("자가진단");
  });

  it("diagnostics section shows L1/L2/L3 labels", async () => {
    const report = await generateDailyReport({ includeDiagnostics: true });
    expect(report).toContain("L1");
    expect(report).toContain("L2");
    expect(report).toContain("L3");
  });
});
