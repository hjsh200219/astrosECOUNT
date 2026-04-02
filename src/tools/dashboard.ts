import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

export function generateBarSvg(items: { label: string; value: number }[]): string {
  const width = 400;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  if (items.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`;
  }

  const maxValue = Math.max(...items.map((i) => i.value), 1);
  const barWidth = Math.floor(chartWidth / items.length) - 4;

  const bars = items
    .map((item, idx) => {
      const barHeight = Math.max(1, Math.round((item.value / maxValue) * chartHeight));
      const x = padding.left + idx * (chartWidth / items.length) + 2;
      const y = padding.top + chartHeight - barHeight;
      const labelX = x + barWidth / 2;
      const labelY = height - padding.bottom + 14;
      return [
        `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#4f86c6" rx="2"/>`,
        `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="11" fill="#333">${escapeHtml(item.label)}</text>`,
      ].join("\n      ");
    })
    .join("\n      ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <g>
    ${bars}
  </g>
</svg>`;
}

// ─── HTML Generation ──────────────────────────────────────────────────────────

export interface DashboardOptions {
  data: object;
  dashboardType: string;
  title?: string;
  language?: "ko" | "en";
}

export function generateDashboardHtml(opts: DashboardOptions): string {
  const { data, dashboardType, title, language = "ko" } = opts;
  const resolvedTitle = title ?? defaultTitle(dashboardType, language);
  const body = renderBody(dashboardType, data, language);

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${escapeHtml(resolvedTitle)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f7fa; color: #333; padding: 24px; }
  h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 20px; color: #1a1a2e; }
  h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 12px; color: #333; }
  .kpi-grid { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
  .kpi-card { background: #fff; border-radius: 8px; padding: 20px 24px; flex: 1 1 140px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  .kpi-card .label { font-size: 0.8rem; color: #777; margin-bottom: 4px; }
  .kpi-card .value { font-size: 1.5rem; font-weight: 700; color: #1a1a2e; }
  .section { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 0.9rem; }
  th { background: #f0f4f8; font-weight: 600; }
  .bar-wrap { background: #e9ecef; border-radius: 4px; height: 12px; }
  .bar-fill { background: #4f86c6; border-radius: 4px; height: 12px; }
  .aging-grid { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  .aging-bucket { flex: 1 1 100px; border-radius: 8px; padding: 16px; color: #fff; text-align: center; }
  .aging-bucket .label { font-size: 0.75rem; margin-bottom: 6px; opacity: .9; }
  .aging-bucket .value { font-size: 1.3rem; font-weight: 700; }
  .pipeline { display: flex; gap: 0; margin-bottom: 20px; }
  .pipeline-stage { flex: 1; text-align: center; padding: 16px 8px; background: #e8f4fd; border-right: 2px solid #fff; }
  .pipeline-stage:first-child { border-radius: 8px 0 0 8px; }
  .pipeline-stage:last-child { border-radius: 0 8px 8px 0; border-right: none; }
  .pipeline-stage .stage-name { font-size: 0.8rem; color: #555; margin-bottom: 4px; }
  .pipeline-stage .stage-value { font-size: 1.3rem; font-weight: 700; color: #1a6ab1; }
  .kv-table td:first-child { font-weight: 600; color: #555; width: 40%; }
  @media print {
    body { background: #fff; padding: 0; }
    .kpi-card, .section { box-shadow: none; border: 1px solid #ddd; }
    .pipeline-stage { border-right: 1px solid #ccc; }
  }
  @media (max-width: 600px) {
    .kpi-grid, .aging-grid, .pipeline { flex-direction: column; }
  }
</style>
</head>
<body>
<h1>${escapeHtml(resolvedTitle)}</h1>
${body}
</body>
</html>`;
}

// ─── Body Renderers ───────────────────────────────────────────────────────────

function renderBody(dashboardType: string, data: object, language: "ko" | "en"): string {
  switch (dashboardType) {
    case "financial_summary":
      return renderFinancialSummary(data as Record<string, unknown>);
    case "aging_report":
      return renderAgingReport(data as Record<string, unknown>);
    case "inventory_pipeline":
      return renderInventoryPipeline(data as Record<string, unknown>);
    case "margin_analysis":
      return renderMarginAnalysis(data as Record<string, unknown>);
    default:
      return renderCustom(data as Record<string, unknown>);
  }
}

function renderFinancialSummary(data: Record<string, unknown>): string {
  const kpiOrder = ["revenue", "cost", "profit", "marginRate"];
  const labelMap: Record<string, string> = {
    revenue: "매출",
    cost: "비용",
    profit: "이익",
    marginRate: "마진율",
  };

  const kpiCards = kpiOrder
    .filter((k) => data[k] !== undefined)
    .map((k) => {
      const val = data[k] as number;
      const formatted = k === "marginRate" ? `${val}%` : formatNumber(val);
      return `<div class="kpi-card"><div class="label">${labelMap[k] ?? k}</div><div class="value">${formatted}</div></div>`;
    })
    .join("\n      ");

  const extraKpis = Object.entries(data)
    .filter(([k]) => !kpiOrder.includes(k))
    .map(([k, v]) => `<div class="kpi-card"><div class="label">${escapeHtml(k)}</div><div class="value">${formatValue(v)}</div></div>`)
    .join("\n      ");

  const chartItems = kpiOrder
    .filter((k) => data[k] !== undefined && k !== "marginRate")
    .map((k) => ({ label: labelMap[k] ?? k, value: data[k] as number }));

  const svg = generateBarSvg(chartItems);

  return `<div class="kpi-grid">
      ${kpiCards}
      ${extraKpis}
    </div>
    <div class="section">
      <h2>차트</h2>
      ${svg}
    </div>`;
}

function renderAgingReport(data: Record<string, unknown>): string {
  const buckets = [
    { key: "current", label: "현재", color: "#27ae60" },
    { key: "1_30", label: "1-30일", color: "#2ecc71" },
    { key: "31_60", label: "31-60일", color: "#f39c12" },
    { key: "61_90", label: "61-90일", color: "#e67e22" },
    { key: "90_plus", label: "90일+", color: "#e74c3c" },
  ];

  const bucketHtml = buckets
    .filter((b) => data[b.key] !== undefined)
    .map(
      (b) =>
        `<div class="aging-bucket" style="background:${b.color}">
          <div class="label">${b.label}</div>
          <div class="value">${formatNumber(data[b.key] as number)}</div>
        </div>`
    )
    .join("\n      ");

  const chartItems = buckets
    .filter((b) => data[b.key] !== undefined)
    .map((b) => ({ label: b.label, value: data[b.key] as number }));

  const svg = generateBarSvg(chartItems);

  return `<div class="section">
      <h2>연령 분석</h2>
      <div class="aging-grid">
        ${bucketHtml}
      </div>
      ${svg}
    </div>`;
}

function renderInventoryPipeline(data: Record<string, unknown>): string {
  const stageOrder = ["계약", "미착", "도착", "상품", "판매완료"];
  const stages = stageOrder
    .map((name) => {
      const val = data[name] !== undefined ? data[name] : null;
      return `<div class="pipeline-stage">
        <div class="stage-name">${escapeHtml(name)}</div>
        <div class="stage-value">${val !== null ? formatValue(val) : "-"}</div>
      </div>`;
    })
    .join("\n      ");

  return `<div class="section">
      <h2>재고 파이프라인</h2>
      <div class="pipeline">
        ${stages}
      </div>
    </div>`;
}

function renderMarginAnalysis(data: Record<string, unknown>): string {
  const items = (data.items ?? []) as Array<Record<string, unknown>>;
  const maxMarginRate = Math.max(...items.map((i) => Number(i.marginRate ?? 0)), 1);

  const rows = items
    .map((item) => {
      const pct = Math.round((Number(item.marginRate ?? 0) / maxMarginRate) * 100);
      return `<tr>
        <td>${escapeHtml(String(item.product ?? ""))}</td>
        <td>${formatNumber(item.revenue as number)}</td>
        <td>${formatNumber(item.cost as number)}</td>
        <td>${formatNumber(item.margin as number)}</td>
        <td>
          <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%"></div></div>
          ${escapeHtml(String(item.marginRate ?? ""))}%
        </td>
      </tr>`;
    })
    .join("\n      ");

  return `<div class="section">
      <h2>마진 분석</h2>
      <table>
        <thead>
          <tr><th>제품</th><th>매출</th><th>비용</th><th>마진</th><th>마진율</th></tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>`;
}

function renderCustom(data: Record<string, unknown>): string {
  const rows = Object.entries(data)
    .map(
      ([k, v]) =>
        `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(formatValue(v))}</td></tr>`
    )
    .join("\n      ");

  return `<div class="section">
      <table class="kv-table">
        <thead><tr><th>항목</th><th>값</th></tr></thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatNumber(n: unknown): string {
  if (typeof n !== "number" || isNaN(n)) return String(n ?? "");
  return n.toLocaleString();
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "number") return formatNumber(v);
  return String(v);
}

function defaultTitle(dashboardType: string, language: "ko" | "en"): string {
  const titles: Record<string, Record<string, string>> = {
    financial_summary: { ko: "재무 요약", en: "Financial Summary" },
    aging_report: { ko: "채권 연령 분석", en: "Aging Report" },
    inventory_pipeline: { ko: "재고 파이프라인", en: "Inventory Pipeline" },
    margin_analysis: { ko: "마진 분석", en: "Margin Analysis" },
    custom: { ko: "대시보드", en: "Dashboard" },
  };
  return titles[dashboardType]?.[language] ?? (language === "ko" ? "대시보드" : "Dashboard");
}

// ─── Tool Registration ────────────────────────────────────────────────────────

export function registerDashboardTools(server: McpServer): void {
  server.tool(
    "ecount_render_dashboard",
    "데이터를 시각화하는 HTML 대시보드를 생성합니다. financial_summary, aging_report, inventory_pipeline, margin_analysis, custom 유형을 지원합니다.",
    {
      data: z.record(z.unknown()).describe("대시보드에 표시할 데이터"),
      dashboardType: z
        .enum(["financial_summary", "aging_report", "inventory_pipeline", "margin_analysis", "custom"])
        .describe("대시보드 유형"),
      title: z.string().optional().describe("대시보드 제목 (선택)"),
      language: z.enum(["ko", "en"]).optional().default("ko").describe("언어 설정"),
    },
    { readOnlyHint: true },
    async (args) => {
      try {
        const html = generateDashboardHtml({
          data: args.data,
          dashboardType: args.dashboardType,
          title: args.title,
          language: args.language as "ko" | "en",
        });
        return formatResponse({ html });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
