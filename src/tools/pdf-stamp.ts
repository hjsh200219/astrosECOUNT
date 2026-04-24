import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PDFDocument, rgb } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface StampOptions {
  x: number;
  y: number;
  width?: number;
  height?: number;
  page?: number; // 0-indexed, default 0
  stampImagePath?: string;
}

/** Validates that a file path is safe (no traversal, absolute only) */
function validatePath(filePath: string): string {
  const resolved = path.resolve(filePath);
  // Reject paths with traversal components
  if (filePath.includes("..")) {
    throw new Error(`경로 접근 거부: '..' 포함된 경로는 사용할 수 없습니다: ${filePath}`);
  }
  return resolved;
}

// Default stamp: generates a simple red circle with "SEAL" text as fallback
async function getDefaultStampImage(): Promise<Uint8Array | null> {
  // Create a minimal 80x80 PNG-like placeholder
  // In production, replace with actual company stamp PNG at src/data/stamp.png
  const stampPath = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    "..",
    "data",
    "stamp.png"
  );

  if (fs.existsSync(stampPath)) {
    return fs.readFileSync(stampPath);
  }

  // No stamp file found — draw a red circle placeholder
  return null;
}

export async function stampPdf(
  pdfBuffer: Buffer,
  options: StampOptions
): Promise<Buffer> {
  const doc = await PDFDocument.load(pdfBuffer);
  const pageIndex = options.page ?? 0;
  const pages = doc.getPages();

  if (pageIndex < 0 || pageIndex >= pages.length) {
    throw new Error(
      `페이지 인덱스 ${pageIndex}가 범위를 벗어났습니다. (총 ${pages.length}페이지)`
    );
  }

  const targetPage = pages[pageIndex];
  const width = options.width ?? 80;
  const height = options.height ?? 80;

  // Try to load stamp image
  let stampImageBytes: Uint8Array | null = null;

  if (options.stampImagePath && fs.existsSync(options.stampImagePath)) {
    stampImageBytes = fs.readFileSync(options.stampImagePath);
  } else {
    stampImageBytes = await getDefaultStampImage();
  }

  if (stampImageBytes) {
    // Detect image type and embed
    const isPng =
      stampImageBytes[0] === 0x89 && stampImageBytes[1] === 0x50;
    const image = isPng
      ? await doc.embedPng(stampImageBytes)
      : await doc.embedJpg(stampImageBytes);

    targetPage.drawImage(image, {
      x: options.x,
      y: options.y,
      width,
      height,
    });
  } else {
    // Fallback: draw a red circle + text as placeholder stamp
    targetPage.drawCircle({
      x: options.x + width / 2,
      y: options.y + height / 2,
      size: width / 2,
      borderColor: rgb(0.8, 0, 0),
      borderWidth: 2,
      opacity: 0.7,
    });
    targetPage.drawText("SEAL", {
      x: options.x + width / 2 - 16,
      y: options.y + height / 2 - 6,
      size: 14,
      color: rgb(0.8, 0, 0),
      opacity: 0.7,
    });
  }

  const resultBytes = await doc.save();
  return Buffer.from(resultBytes);
}

export function registerPdfStampTool(server: McpServer): void {
  server.tool(
    "ecount_pdf_stamp_pdf",
    "PDF 문서에 법인 직인 이미지를 삽입합니다. 계약서 등 PDF 파일 경로와 직인 위치를 지정하면 직인이 찍힌 PDF를 생성합니다.",
    {
      pdf_path: z.string().describe("원본 PDF 파일 경로"),
      output_path: z.string().describe("직인 삽입된 PDF 저장 경로"),
      x: z.number().default(400).describe("X 좌표 (좌측 기준, pt)"),
      y: z.number().default(100).describe("Y 좌표 (하단 기준, pt)"),
      width: z.number().default(80).describe("pt"),
      height: z.number().default(80).describe("pt"),
      page: z.number().default(0).describe("페이지 (0부터 시작)"),
      stamp_image_path: z
        .string()
        .optional()
        .describe("PNG/JPG. 미지정 시 기본 직인 사용"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (params: Record<string, unknown>) => {
      try {
        const pdfPath = validatePath(params.pdf_path as string);
        const outputPath = validatePath(params.output_path as string);
        const stampImagePath = params.stamp_image_path
          ? validatePath(params.stamp_image_path as string)
          : undefined;

        if (!fs.existsSync(pdfPath)) {
          return formatResponse({
            success: false,
            error: `PDF 파일을 찾을 수 없습니다: ${pdfPath}`,
          });
        }

        const pdfBuffer = fs.readFileSync(pdfPath);
        const result = await stampPdf(Buffer.from(pdfBuffer), {
          x: params.x as number,
          y: params.y as number,
          width: params.width as number,
          height: params.height as number,
          page: params.page as number,
          stampImagePath,
        });

        fs.writeFileSync(outputPath, result);

        return formatResponse({
          success: true,
          message: `직인 삽입 완료: ${outputPath}`,
          inputPath: pdfPath,
          outputPath,
          pageStamped: params.page,
          position: { x: params.x, y: params.y },
        });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
