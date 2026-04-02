import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("PDF Export Tools", () => {
  describe("generatePdfFromData", () => {
    it("should return a Buffer starting with %PDF magic bytes", async () => {
      const { generatePdfFromData } = await import("../../src/tools/pdf-export.js");
      const buf = await generatePdfFromData({
        title: "테스트 리포트",
        data: [
          { name: "소고기", quantity: 100, price: 50000 },
          { name: "돼지고기", quantity: 200, price: 30000 },
        ],
      });
      expect(buf).toBeInstanceOf(Uint8Array);
      // PDF magic bytes: %PDF
      const header = String.fromCharCode(buf[0], buf[1], buf[2], buf[3]);
      expect(header).toBe("%PDF");
    });

    it("should accept optional columns parameter for column ordering", async () => {
      const { generatePdfFromData } = await import("../../src/tools/pdf-export.js");
      const buf = await generatePdfFromData({
        title: "컬럼 테스트",
        data: [{ a: 1, b: 2, c: 3 }],
        columns: ["c", "a"],
      });
      expect(buf).toBeInstanceOf(Uint8Array);
      const header = String.fromCharCode(buf[0], buf[1], buf[2], buf[3]);
      expect(header).toBe("%PDF");
    });

    it("should accept orientation parameter", async () => {
      const { generatePdfFromData } = await import("../../src/tools/pdf-export.js");
      const portrait = await generatePdfFromData({
        title: "세로",
        data: [{ x: 1 }],
        orientation: "portrait",
      });
      const landscape = await generatePdfFromData({
        title: "가로",
        data: [{ x: 1 }],
        orientation: "landscape",
      });
      // Both should produce valid PDFs
      expect(String.fromCharCode(portrait[0], portrait[1], portrait[2], portrait[3])).toBe("%PDF");
      expect(String.fromCharCode(landscape[0], landscape[1], landscape[2], landscape[3])).toBe("%PDF");
      // Landscape PDF should be different size than portrait
      expect(landscape.length).not.toBe(portrait.length);
    });

    it("should handle empty data array", async () => {
      const { generatePdfFromData } = await import("../../src/tools/pdf-export.js");
      const buf = await generatePdfFromData({
        title: "빈 데이터",
        data: [],
      });
      expect(buf).toBeInstanceOf(Uint8Array);
      const header = String.fromCharCode(buf[0], buf[1], buf[2], buf[3]);
      expect(header).toBe("%PDF");
    });

    it("should handle large data with page overflow", async () => {
      const { generatePdfFromData } = await import("../../src/tools/pdf-export.js");
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `품목_${i + 1}`,
        price: Math.round(Math.random() * 100000),
      }));
      const buf = await generatePdfFromData({
        title: "대용량 데이터",
        data: largeData,
      });
      expect(buf).toBeInstanceOf(Uint8Array);
      // Large data should produce a bigger PDF (multiple pages)
      expect(buf.length).toBeGreaterThan(1000);
    });
  });

  describe("registerPdfExportTools", () => {
    it("should register 1 tool without throwing", async () => {
      const server = new McpServer({ name: "pdf-test", version: "0.1" });
      const toolSpy = vi.spyOn(server, "tool");
      const { registerPdfExportTools } = await import("../../src/tools/pdf-export.js");
      registerPdfExportTools(server);
      expect(toolSpy).toHaveBeenCalledTimes(1);
      expect(toolSpy.mock.calls[0][0]).toBe("ecount_export_pdf");
      toolSpy.mockRestore();
    });
  });
});
