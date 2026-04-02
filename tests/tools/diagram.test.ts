import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("Diagram Tools", () => {
  describe("generateDiagramHtml", () => {
    it("should generate workflow diagram HTML with Mermaid CDN", async () => {
      const { generateDiagramHtml } = await import("../../src/tools/diagram.js");
      const html = generateDiagramHtml(
        "workflow",
        { stages: [{ id: "A", label: "견적" }, { id: "B", label: "수주" }] },
        "업무 흐름",
      );
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("mermaid");
      expect(html).toContain("graph LR");
      expect(html).toContain("업무 흐름");
    });

    it("should generate state diagram HTML", async () => {
      const { generateDiagramHtml } = await import("../../src/tools/diagram.js");
      const html = generateDiagramHtml("state_diagram", {
        states: ["계약", "미착"],
        transitions: [{ from: "계약", to: "미착" }],
      });
      expect(html).toContain("stateDiagram-v2");
      expect(html).toContain("계약 --> 미착");
    });

    it("should pass through custom Mermaid definition", async () => {
      const { generateDiagramHtml } = await import("../../src/tools/diagram.js");
      const html = generateDiagramHtml("custom", {
        definition: "graph TD\n  X --> Y",
      });
      expect(html).toContain("graph TD");
      expect(html).toContain("X --> Y");
    });

    it("should include mermaid.initialize script", async () => {
      const { generateDiagramHtml } = await import("../../src/tools/diagram.js");
      const html = generateDiagramHtml("workflow", { stages: [] });
      expect(html).toContain("mermaid.initialize");
    });
  });

  describe("registerDiagramTools", () => {
    it("should register ecount_render_diagram tool", async () => {
      const server = new McpServer({ name: "diag-test", version: "0.1" });
      const toolSpy = vi.spyOn(server, "tool");
      const { registerDiagramTools } = await import("../../src/tools/diagram.js");
      registerDiagramTools(server);
      expect(toolSpy).toHaveBeenCalledTimes(1);
      expect(toolSpy.mock.calls[0][0]).toBe("ecount_render_diagram");
      toolSpy.mockRestore();
    });
  });
});
