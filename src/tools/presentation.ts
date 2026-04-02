import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { buildHtmlDocument } from "../utils/html-builder.js";
import {
  buildPresentationHtml,
  getPresentationCdnLibs,
  getPresentationExtraStyles,
} from "../utils/slide-renderer.js";
import type { SlideData } from "../utils/slide-renderer.js";

const slideSchema = z.object({
  type: z
    .enum(["title", "content", "stat", "chart", "two_column", "closing"])
    .describe("슬라이드 유형"),
  title: z.string().describe("슬라이드 제목"),
  content: z.string().optional().describe("본문 내용"),
  subtitle: z.string().optional().describe("부제목 (title 유형)"),
  statValue: z.union([z.number(), z.string()]).optional().describe("통계 값 (stat 유형)"),
  statLabel: z.string().optional().describe("통계 레이블 (stat 유형)"),
  leftContent: z.string().optional().describe("왼쪽 열 (two_column 유형)"),
  rightContent: z.string().optional().describe("오른쪽 열 (two_column 유형)"),
  chartData: z
    .object({
      labels: z.array(z.string()),
      values: z.array(z.number()),
      chartType: z.string().optional(),
    })
    .optional()
    .describe("차트 데이터 (chart 유형)"),
});

export function generatePresentationHtml(
  slides: SlideData[],
  title?: string,
  language: "ko" | "en" = "ko",
): string {
  const body = buildPresentationHtml(slides, title, language);
  const cdnLibs = getPresentationCdnLibs(slides);

  return buildHtmlDocument({
    title: title ?? (language === "ko" ? "프레젠테이션" : "Presentation"),
    language,
    body,
    cdnLibs,
    extraStyles: getPresentationExtraStyles(),
  });
}

export function registerPresentationTools(server: McpServer): void {
  server.tool(
    "ecount_render_presentation",
    "Reveal.js 기반 프레젠테이션 슬라이드를 생성합니다. 경영 보고서, 일일 브리핑, 자가진단 결과 발표에 사용합니다.",
    {
      slides: z.array(slideSchema).min(1).describe("슬라이드 목록 (1개 이상)"),
      title: z.string().optional().describe("프레젠테이션 제목"),
      language: z.enum(["ko", "en"]).optional().default("ko").describe("언어 설정"),
    },
    { readOnlyHint: true },
    async (args) => {
      try {
        const html = generatePresentationHtml(
          args.slides as SlideData[],
          args.title,
          args.language as "ko" | "en",
        );
        return formatResponse({ html });
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
