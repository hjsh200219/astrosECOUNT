import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { buildHtmlDocument } from "../utils/html-builder.js";
import { renderBody } from "../utils/dashboard-renderers.js";
import { defaultTitle } from "../utils/html-helpers.js";
import type { CdnLibrary } from "../utils/cdn-loader.js";

export { generateBarSvg } from "../utils/chart-renderer.js";
export { renderBody, renderFinancialSummary, renderAgingReport, renderInventoryPipeline, renderMarginAnalysis, renderCustom, renderTreemap, renderHeatmap, renderSankey } from "../utils/dashboard-renderers.js";

export interface DashboardOptions {
  data: object;
  dashboardType: string;
  title?: string;
  language?: "ko" | "en";
  outputFormat?: "html" | "html_interactive";
}

export function generateDashboardHtml(opts: DashboardOptions): string {
  const { data, dashboardType, title, language = "ko" } = opts;
  const interactive = opts.outputFormat === "html_interactive";
  const resolvedTitle = title ?? defaultTitle(dashboardType, language);
  const body = renderBody(dashboardType, data, interactive);

  const D3_TYPES = ["treemap", "heatmap", "sankey"];
  const needsD3 = D3_TYPES.includes(dashboardType);
  const cdnLibs: CdnLibrary[] = [];
  if (interactive) cdnLibs.push("chartjs", "html-to-image");
  if (needsD3) cdnLibs.push("d3");

  return buildHtmlDocument({
    title: resolvedTitle,
    language,
    body,
    cdnLibs,
  });
}

const DASHBOARD_TYPES = [
  "financial_summary",
  "aging_report",
  "inventory_pipeline",
  "margin_analysis",
  "treemap",
  "heatmap",
  "sankey",
  "custom",
] as const;

export function registerDashboardTools(server: McpServer): void {
  server.tool(
    "ecount_render_dashboard",
    "데이터를 시각화하는 HTML 대시보드를 생성합니다. Chart.js 인터랙티브 차트, D3.js 트리맵/히트맵/생키 다이어그램을 지원합니다.",
    {
      data: z.record(z.string(), z.unknown()).describe("대시보드에 표시할 데이터"),
      dashboardType: z
        .enum(DASHBOARD_TYPES)
        .describe("대시보드 유형"),
      title: z.string().optional().describe("대시보드 제목 (선택)"),
      language: z.enum(["ko", "en"]).optional().default("ko").describe("언어 설정"),
      outputFormat: z
        .enum(["html", "html_interactive"])
        .optional()
        .default("html")
        .describe("출력 형식: html (정적 SVG), html_interactive (Chart.js 인터랙티브)"),
    },
    { readOnlyHint: true },
    async (args) => {
      try {
        const html = generateDashboardHtml({
          data: args.data,
          dashboardType: args.dashboardType,
          title: args.title,
          language: args.language as "ko" | "en",
          outputFormat: args.outputFormat as "html" | "html_interactive",
        });
        return formatResponse({ html });
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
