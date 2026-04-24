import { describe, it, expect } from "vitest";
import { stampPdf } from "../../src/tools/pdf-stamp.js";
import { PDFDocument } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";

// Create a minimal test PDF
async function createTestPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  page.drawText("Test Contract Document", { x: 50, y: 750, size: 20 });
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

describe("stampPdf", () => {
  it("should stamp a PDF and return valid PDF bytes", async () => {
    const inputPdf = await createTestPdf();
    const result = await stampPdf(inputPdf, {
      x: 400,
      y: 100,
      width: 80,
      height: 80,
    });

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(inputPdf.length);

    // Verify it's a valid PDF
    const doc = await PDFDocument.load(result);
    expect(doc.getPageCount()).toBe(1);
  });

  it("should stamp on specific page", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    doc.addPage([595, 842]);
    const inputPdf = Buffer.from(await doc.save());

    const result = await stampPdf(inputPdf, {
      x: 400,
      y: 100,
      width: 80,
      height: 80,
      page: 1, // second page (0-indexed)
    });

    expect(result).toBeInstanceOf(Buffer);
    const resultDoc = await PDFDocument.load(result);
    expect(resultDoc.getPageCount()).toBe(2);
  });

  it("should use default stamp image when none provided", async () => {
    const inputPdf = await createTestPdf();
    // Should not throw even without explicit stamp image
    const result = await stampPdf(inputPdf, {
      x: 400,
      y: 100,
    });
    expect(result).toBeInstanceOf(Buffer);
  });

  it("should throw on out-of-range page index", async () => {
    const inputPdf = await createTestPdf();
    await expect(
      stampPdf(inputPdf, { x: 0, y: 0, page: 5 })
    ).rejects.toThrow("범위를 벗어났습니다");
  });

  it("should throw on invalid PDF input", async () => {
    const invalidPdf = Buffer.from("not a pdf");
    await expect(
      stampPdf(invalidPdf, { x: 0, y: 0 })
    ).rejects.toThrow();
  });
});

describe("registerPdfStampTool", () => {
  it("should register ecount_pdf_stamp_pdf tool without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerPdfStampTool } = await import("../../src/tools/pdf-stamp.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerPdfStampTool(server)).not.toThrow();
  });
});
