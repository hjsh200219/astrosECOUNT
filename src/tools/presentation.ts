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
    .enum(["title", "content", "stat", "chart", "two_column", "closing"]),
  title: z.string(),
  content: z.string().optional(),
  subtitle: z.string().optional().describe("title 유형"),
  statValue: z.union([z.number(), z.string()]).optional().describe("stat 유형"),
  statLabel: z.string().optional().describe("stat 유형"),
  leftContent: z.string().optional().describe("two_column 유형"),
  rightContent: z.string().optional().describe("two_column 유형"),
  chartData: z
    .object({
      labels: z.array(z.string()),
      values: z.array(z.number()),
      chartType: z.string().optional(),
    })
    .optional()
    .describe("chart 유형"),
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
    "ecount_presentation_render_presentation",
    "Reveal.js 기반 프레젠테이션 슬라이드를 생성합니다. 경영 보고서, 일일 브리핑, 자가진단 결과 발표에 사용합니다.",
    {
      slides: z.array(slideSchema).min(1),
      title: z.string().optional(),
      language: z.enum(["ko", "en"]).optional().default("ko"),
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
