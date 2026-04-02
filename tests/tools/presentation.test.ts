import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("Presentation Tools", () => {
  describe("generatePresentationHtml", () => {
    it("should generate full HTML with Reveal.js CDN", async () => {
      const { generatePresentationHtml } = await import("../../src/tools/presentation.js");
      const html = generatePresentationHtml(
        [
          { type: "title", title: "보고서", subtitle: "2025년" },
          { type: "content", title: "요약", content: "내용" },
        ],
        "월간 보고",
      );
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("reveal.js");
      expect(html).toContain("reveal.css");
      expect(html).toContain("월간 보고");
    });

    it("should include Chart.js CDN when chart slides exist", async () => {
      const { generatePresentationHtml } = await import("../../src/tools/presentation.js");
      const html = generatePresentationHtml([
        {
          type: "chart",
          title: "매출 추이",
          chartData: { labels: ["1월"], values: [100] },
        },
      ]);
      expect(html).toContain("chart.js");
      expect(html).toContain("<canvas");
    });

    it("should not include Chart.js CDN when no chart slides", async () => {
      const { generatePresentationHtml } = await import("../../src/tools/presentation.js");
      const html = generatePresentationHtml([
        { type: "title", title: "제목" },
      ]);
      expect(html).not.toContain("chart.js");
    });
  });

  describe("registerPresentationTools", () => {
    it("should register ecount_render_presentation tool", async () => {
      const server = new McpServer({ name: "pres-test", version: "0.1" });
      const toolSpy = vi.spyOn(server, "tool");
      const { registerPresentationTools } = await import("../../src/tools/presentation.js");
      registerPresentationTools(server);
      expect(toolSpy).toHaveBeenCalledTimes(1);
      expect(toolSpy.mock.calls[0][0]).toBe("ecount_render_presentation");
      toolSpy.mockRestore();
    });
  });
});
