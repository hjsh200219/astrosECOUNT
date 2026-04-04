import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { PDFFont, PDFPage } from "pdf-lib";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface PdfFromDataOptions {
  title: string;
  data: Record<string, unknown>[];
  columns?: string[];
  orientation?: "portrait" | "landscape";
}

function toWinAnsi(text: string): string {
  return text.replace(/[^\u0000-\u00FF]/g, "?");
}

const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const MARGIN = 40;
const HEADER_FONT_SIZE = 14;
const CELL_FONT_SIZE = 9;
const ROW_HEIGHT = 16;
const HEADER_ROW_HEIGHT = 20;
const TITLE_HEIGHT = 30;

function drawTitle(page: PDFPage, title: string, boldFont: PDFFont, cursorY: number): number {
  page.drawText(toWinAnsi(title), {
    x: MARGIN,
    y: cursorY - HEADER_FONT_SIZE,
    size: HEADER_FONT_SIZE,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  return cursorY - (TITLE_HEIGHT + 8);
}

function drawColumnHeaders(
  page: PDFPage,
  cols: string[],
  colWidth: number,
  contentWidth: number,
  boldFont: PDFFont,
  cursorY: number,
): number {
  page.drawRectangle({
    x: MARGIN,
    y: cursorY - HEADER_ROW_HEIGHT,
    width: contentWidth,
    height: HEADER_ROW_HEIGHT,
    color: rgb(0.85, 0.85, 0.85),
  });

  for (let ci = 0; ci < cols.length; ci++) {
    page.drawText(toWinAnsi(String(cols[ci])), {
      x: MARGIN + ci * colWidth + 3,
      y: cursorY - HEADER_ROW_HEIGHT + 5,
      size: CELL_FONT_SIZE,
      font: boldFont,
      color: rgb(0, 0, 0),
      maxWidth: colWidth - 6,
    });
  }

  return cursorY - HEADER_ROW_HEIGHT;
}

function drawDataRows(
  page: PDFPage,
  rows: Record<string, unknown>[],
  cols: string[],
  colWidth: number,
  contentWidth: number,
  font: PDFFont,
  cursorY: number,
): void {
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const rowY = cursorY - (ri + 1) * ROW_HEIGHT;

    if (ri % 2 === 1) {
      page.drawRectangle({
        x: MARGIN,
        y: rowY,
        width: contentWidth,
        height: ROW_HEIGHT,
        color: rgb(0.96, 0.96, 0.96),
      });
    }

    for (let ci = 0; ci < cols.length; ci++) {
      const cellValue = row[cols[ci]];
      page.drawText(toWinAnsi(cellValue == null ? "" : String(cellValue)), {
        x: MARGIN + ci * colWidth + 3,
        y: rowY + 4,
        size: CELL_FONT_SIZE,
        font,
        color: rgb(0, 0, 0),
        maxWidth: colWidth - 6,
      });
    }
  }
}

function drawTableBorder(
  page: PDFPage,
  contentWidth: number,
  rowCount: number,
  cursorY: number,
): void {
  page.drawRectangle({
    x: MARGIN,
    y: cursorY - rowCount * ROW_HEIGHT,
    width: contentWidth,
    height: HEADER_ROW_HEIGHT + rowCount * ROW_HEIGHT,
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 0.5,
  });
}

function drawPageNumber(page: PDFPage, font: PDFFont, pageIdx: number, totalPages: number, pageWidth: number): void {
  const pageNumText = `${pageIdx + 1} / ${totalPages}`;
  const textWidth = font.widthOfTextAtSize(pageNumText, 8);
  page.drawText(pageNumText, {
    x: pageWidth / 2 - textWidth / 2,
    y: MARGIN / 2,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
}

export async function generatePdfFromData(opts: PdfFromDataOptions): Promise<Uint8Array> {
  const { title, data, columns, orientation = "portrait" } = opts;

  const pageWidth = orientation === "landscape" ? A4_HEIGHT : A4_WIDTH;
  const pageHeight = orientation === "landscape" ? A4_WIDTH : A4_HEIGHT;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setCreator(`astros-ecount-mcp orientation=${orientation}`);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const cols: string[] =
    columns && columns.length > 0
      ? columns
      : data.length > 0
      ? Object.keys(data[0])
      : [];

  const contentWidth = pageWidth - MARGIN * 2;
  const colWidth = cols.length > 0 ? contentWidth / cols.length : contentWidth;

  const titleAreaHeight = TITLE_HEIGHT + 8;
  const firstPageUsable = pageHeight - MARGIN * 2 - titleAreaHeight - HEADER_ROW_HEIGHT;
  const otherPageUsable = pageHeight - MARGIN * 2 - HEADER_ROW_HEIGHT;
  const rowsPerFirstPage = Math.floor(firstPageUsable / ROW_HEIGHT);
  const rowsPerOtherPage = Math.floor(otherPageUsable / ROW_HEIGHT);

  const pageChunks: Record<string, unknown>[][] = [];
  if (data.length === 0) {
    pageChunks.push([]);
  } else {
    const remaining = [...data];
    pageChunks.push(remaining.splice(0, rowsPerFirstPage));
    while (remaining.length > 0) {
      pageChunks.push(remaining.splice(0, rowsPerOtherPage));
    }
  }

  for (let pageIdx = 0; pageIdx < pageChunks.length; pageIdx++) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const chunk = pageChunks[pageIdx];
    let cursorY = pageHeight - MARGIN;

    if (pageIdx === 0) {
      cursorY = drawTitle(page, title, boldFont, cursorY);
    } else {
      cursorY -= 8;
    }

    if (cols.length > 0) {
      cursorY = drawColumnHeaders(page, cols, colWidth, contentWidth, boldFont, cursorY);
      drawDataRows(page, chunk, cols, colWidth, contentWidth, font, cursorY);
      drawTableBorder(page, contentWidth, chunk.length, cursorY);
    }

    drawPageNumber(page, font, pageIdx, pageChunks.length, pageWidth);
  }

  return pdfDoc.save();
}

export function registerPdfExportTools(server: McpServer): void {
  server.tool(
    "ecount_export_pdf",
    "데이터를 PDF 파일로 내보냅니다. 테이블 형식의 데이터를 PDF로 저장합니다.",
    {
      output_path: z.string().describe("저장할 PDF 파일 경로 (절대 경로)"),
      title: z.string().describe("PDF 제목"),
      data: z.array(z.record(z.string(), z.unknown())).describe("내보낼 데이터 배열"),
      columns: z.array(z.string()).optional().describe("표시할 컬럼 목록 (순서 지정, 미지정시 자동)"),
      orientation: z.enum(["portrait", "landscape"]).optional().describe("용지 방향 (portrait: 세로, landscape: 가로)"),
    },
    async ({ output_path, title, data, columns, orientation }) => {
      try {
        const resolvedPath = path.resolve(output_path);
        const allowedPrefixes = [os.tmpdir(), os.homedir()];
        const isAllowed = allowedPrefixes.some(
          (prefix) => resolvedPath === prefix || resolvedPath.startsWith(prefix + path.sep),
        );
        if (!isAllowed) {
          throw new Error(`경로 접근 거부: 허용된 디렉토리 외부입니다: ${resolvedPath}`);
        }

        const dir = path.dirname(resolvedPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const pdfBytes = await generatePdfFromData({ title, data, columns, orientation });
        fs.writeFileSync(resolvedPath, pdfBytes);

        return formatResponse({
          success: true,
          message: `PDF가 성공적으로 저장되었습니다: ${resolvedPath}`,
          rows: data.length,
          pages: Math.ceil(Math.max(data.length, 1) / 40),
        });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
