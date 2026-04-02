import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("3D Tools", () => {
  describe("generate3dHtml", () => {
    it("should generate warehouse scene HTML", async () => {
      const { generate3dHtml } = await import("../../src/tools/three-d.js");
      const html = generate3dHtml("warehouse", {
        zones: [
          { name: "A구역", x: 0, z: 0, width: 3, depth: 3, occupancy: 0.7 },
        ],
        }, "창고 현황");
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("창고 현황");
      expect(html).toContain("THREE.BoxGeometry");
    });

    it("should generate logistics network scene HTML", async () => {
      const { generate3dHtml } = await import("../../src/tools/three-d.js");
      const html = generate3dHtml("logistics_network", {
        nodes: [{ id: "a", label: "항구", x: 0, y: 0, z: 0 }],
        edges: [],
      });
      expect(html).toContain("SphereGeometry");
      expect(html).toContain("항구");
    });

    it("should handle custom scene type", async () => {
      const { generate3dHtml } = await import("../../src/tools/three-d.js");
      const html = generate3dHtml("custom", {});
      expect(html).toContain("custom sceneType");
    });
  });

  describe("register3dTools", () => {
    it("should register ecount_render_3d tool", async () => {
      const server = new McpServer({ name: "3d-test", version: "0.1" });
      const toolSpy = vi.spyOn(server, "tool");
      const { register3dTools } = await import("../../src/tools/three-d.js");
      register3dTools(server);
      expect(toolSpy).toHaveBeenCalledTimes(1);
      expect(toolSpy.mock.calls[0][0]).toBe("ecount_render_3d");
      toolSpy.mockRestore();
    });
  });
});
