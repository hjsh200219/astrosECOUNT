import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("Map Tools", () => {
  describe("generateMapHtml", () => {
    it("should generate HTML with Leaflet CDN", async () => {
      const { generateMapHtml } = await import("../../src/tools/map.js");
      const html = generateMapHtml(
        [{ lat: 37.5, lng: 127.0, label: "서울" }],
        [],
        undefined,
        undefined,
        "물류 지도",
      );
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("leaflet");
      expect(html).toContain("물류 지도");
      expect(html).toContain("L.map");
    });

    it("should render routes", async () => {
      const { generateMapHtml } = await import("../../src/tools/map.js");
      const html = generateMapHtml(
        [],
        [{ points: [{ lat: 35, lng: 129 }, { lat: 37, lng: 127 }] }],
      );
      expect(html).toContain("polyline");
    });

    it("should include Leaflet CSS", async () => {
      const { generateMapHtml } = await import("../../src/tools/map.js");
      const html = generateMapHtml([], []);
      expect(html).toContain("leaflet.css");
    });
  });

  describe("registerMapTools", () => {
    it("should register ecount_render_map tool", async () => {
      const server = new McpServer({ name: "map-test", version: "0.1" });
      const toolSpy = vi.spyOn(server, "tool");
      const { registerMapTools } = await import("../../src/tools/map.js");
      registerMapTools(server);
      expect(toolSpy).toHaveBeenCalledTimes(1);
      expect(toolSpy.mock.calls[0][0]).toBe("ecount_render_map");
      toolSpy.mockRestore();
    });
  });
});
