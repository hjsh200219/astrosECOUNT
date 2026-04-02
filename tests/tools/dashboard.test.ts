import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("Dashboard Tools", () => {
  describe("generateBarSvg", () => {
    it("should return valid SVG with rect elements", async () => {
      const { generateBarSvg } = await import("../../src/tools/dashboard.js");
      const items = [
        { label: "매출", value: 1000 },
        { label: "비용", value: 600 },
        { label: "이익", value: 400 },
      ];
      const svg = generateBarSvg(items);
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
      expect(svg).toContain("<rect");
      expect((svg.match(/<rect/g) || []).length).toBeGreaterThanOrEqual(3);
    });

    it("should handle empty items", async () => {
      const { generateBarSvg } = await import("../../src/tools/dashboard.js");
      const svg = generateBarSvg([]);
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
    });

    it("should handle single item", async () => {
      const { generateBarSvg } = await import("../../src/tools/dashboard.js");
      const svg = generateBarSvg([{ label: "테스트", value: 500 }]);
      expect(svg).toContain("<rect");
      expect(svg).toContain("테스트");
    });
  });

  describe("generateDashboardHtml", () => {
    it("should return complete HTML document with DOCTYPE", async () => {
      const { generateDashboardHtml } = await import("../../src/tools/dashboard.js");
      const html = generateDashboardHtml({
        data: { revenue: 10000, cost: 6000, profit: 4000 },
        dashboardType: "financial_summary",
        title: "재무 요약",
      });
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
      expect(html).toContain("재무 요약");
    });

    it("should include inline CSS with no external references in default mode", async () => {
      const { generateDashboardHtml } = await import("../../src/tools/dashboard.js");
      const html = generateDashboardHtml({
        data: { total: 100 },
        dashboardType: "custom",
      });
      expect(html).toContain("<style>");
      expect(html).not.toContain("chart.js");
    });

    it("should include @media print CSS", async () => {
      const { generateDashboardHtml } = await import("../../src/tools/dashboard.js");
      const html = generateDashboardHtml({
        data: { total: 100 },
        dashboardType: "custom",
      });
      expect(html).toContain("@media print");
    });

    it("should render financial_summary with KPI cards", async () => {
      const { generateDashboardHtml } = await import("../../src/tools/dashboard.js");
      const html = generateDashboardHtml({
        data: { revenue: 50000, cost: 30000, profit: 20000, marginRate: 40 },
        dashboardType: "financial_summary",
      });
      expect(html).toContain("50,000");
      expect(html).toContain("<svg");
    });

    it("should render aging_report with colored buckets", async () => {
      const { generateDashboardHtml } = await import("../../src/tools/dashboard.js");
      const html = generateDashboardHtml({
        data: { current: 5000, "1_30": 3000, "31_60": 1000, "61_90": 500, "90_plus": 200 },
        dashboardType: "aging_report",
      });
      expect(html).toContain("5,000");
      expect(html).toContain("<svg");
    });

    it("should render inventory_pipeline with 5 stages", async () => {
      const { generateDashboardHtml } = await import("../../src/tools/dashboard.js");
      const html = generateDashboardHtml({
        data: { 계약: 10, 미착: 8, 도착: 5, 상품: 3, 판매완료: 2 },
        dashboardType: "inventory_pipeline",
      });
      expect(html).toContain("계약");
      expect(html).toContain("판매완료");
    });

    it("should render margin_analysis with bars and table", async () => {
      const { generateDashboardHtml } = await import("../../src/tools/dashboard.js");
      const html = generateDashboardHtml({
        data: {
          items: [
            { product: "소고기", revenue: 10000, cost: 7000, margin: 3000, marginRate: 30 },
            { product: "돼지고기", revenue: 8000, cost: 5000, margin: 3000, marginRate: 37.5 },
          ],
        },
        dashboardType: "margin_analysis",
      });
      expect(html).toContain("소고기");
      expect(html).toContain("<table");
    });

    it("should render custom type as key-value table", async () => {
      const { generateDashboardHtml } = await import("../../src/tools/dashboard.js");
      const html = generateDashboardHtml({
        data: { key1: "value1", key2: 42, nested: { a: 1 } },
        dashboardType: "custom",
      });
      expect(html).toContain("key1");
      expect(html).toContain("value1");
      expect(html).toContain("<table");
    });

    it("should support ko and en language", async () => {
      const { generateDashboardHtml } = await import("../../src/tools/dashboard.js");
      const htmlKo = generateDashboardHtml({
        data: { total: 100 },
        dashboardType: "custom",
        language: "ko",
      });
      const htmlEn = generateDashboardHtml({
        data: { total: 100 },
        dashboardType: "custom",
        language: "en",
      });
      expect(htmlKo).toContain('lang="ko"');
      expect(htmlEn).toContain('lang="en"');
    });
  });

  describe("generateDashboardHtml — interactive mode", () => {
    it("should include Chart.js CDN when outputFormat is html_interactive", async () => {
      const { generateDashboardHtml } = await import("../../src/tools/dashboard.js");
      const html = generateDashboardHtml({
        data: { revenue: 10000, cost: 6000, profit: 4000 },
        dashboardType: "financial_summary",
        outputFormat: "html_interactive",
      });
      expect(html).toContain("chart.js");
      expect(html).toContain("Chart.defaults.animation=false");
    });

    it("should include canvas elements instead of SVG in interactive mode", async () => {
      const { generateDashboardHtml } = await import("../../src/tools/dashboard.js");
      const html = generateDashboardHtml({
        data: { revenue: 10000, cost: 6000, profit: 4000 },
        dashboardType: "financial_summary",
        outputFormat: "html_interactive",
      });
      expect(html).toContain("<canvas");
      expect(html).toContain("new Chart");
    });

    it("should include html-to-image CDN in interactive mode", async () => {
      const { generateDashboardHtml } = await import("../../src/tools/dashboard.js");
      const html = generateDashboardHtml({
        data: { total: 100 },
        dashboardType: "custom",
        outputFormat: "html_interactive",
      });
      expect(html).toContain("html-to-image");
    });

    it("should render aging_report with doughnut chart in interactive mode", async () => {
      const { generateDashboardHtml } = await import("../../src/tools/dashboard.js");
      const html = generateDashboardHtml({
        data: { current: 5000, "1_30": 3000 },
        dashboardType: "aging_report",
        outputFormat: "html_interactive",
      });
      expect(html).toContain("<canvas");
      expect(html).toContain("doughnut");
    });

    it("should render margin_analysis with chart in interactive mode", async () => {
      const { generateDashboardHtml } = await import("../../src/tools/dashboard.js");
      const html = generateDashboardHtml({
        data: {
          items: [{ product: "A", revenue: 100, cost: 50, margin: 50, marginRate: 50 }],
        },
        dashboardType: "margin_analysis",
        outputFormat: "html_interactive",
      });
      expect(html).toContain("<canvas");
      expect(html).toContain("<table");
    });
  });

  describe("registerDashboardTools", () => {
    it("should register 1 tool without throwing", async () => {
      const server = new McpServer({ name: "dash-test", version: "0.1" });
      const toolSpy = vi.spyOn(server, "tool");
      const { registerDashboardTools } = await import("../../src/tools/dashboard.js");
      registerDashboardTools(server);
      expect(toolSpy).toHaveBeenCalledTimes(1);
      expect(toolSpy.mock.calls[0][0]).toBe("ecount_render_dashboard");
      toolSpy.mockRestore();
    });
  });
});
