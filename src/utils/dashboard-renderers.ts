import { generateBarSvg, buildChartJsConfig, buildChartJsScript } from "./chart-renderer.js";
import { escapeHtml, formatNumber, formatValue } from "./html-helpers.js";
import { buildTreemapHtml, buildHeatmapHtml, buildSankeyHtml } from "./d3-renderer.js";
import type { TreemapItem, HeatmapCell, SankeyLink } from "./d3-renderer.js";

export function renderFinancialSummary(
  data: Record<string, unknown>,
  interactive = false,
): string {
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
    .map(
      ([k, v]) =>
        `<div class="kpi-card"><div class="label">${escapeHtml(k)}</div><div class="value">${formatValue(v)}</div></div>`,
    )
    .join("\n      ");

  const chartItems = kpiOrder
    .filter((k) => data[k] !== undefined && k !== "marginRate")
    .map((k) => ({ label: labelMap[k] ?? k, value: data[k] as number }));

  const chart = interactive
    ? renderChartJsCanvas("finChart", "bar", chartItems)
    : generateBarSvg(chartItems);

  return `<div class="kpi-grid">
      ${kpiCards}
      ${extraKpis}
    </div>
    <div class="section">
      <h2>차트</h2>
      ${chart}
    </div>`;
}

export function renderAgingReport(
  data: Record<string, unknown>,
  interactive = false,
): string {
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
        </div>`,
    )
    .join("\n      ");

  const chartItems = buckets
    .filter((b) => data[b.key] !== undefined)
    .map((b) => ({ label: b.label, value: data[b.key] as number }));

  const chart = interactive
    ? renderChartJsCanvas("agingChart", "doughnut", chartItems)
    : generateBarSvg(chartItems);

  return `<div class="section">
      <h2>연령 분석</h2>
      <div class="aging-grid">
        ${bucketHtml}
      </div>
      ${chart}
    </div>`;
}

export function renderInventoryPipeline(
  data: Record<string, unknown>,
): string {
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

export function renderMarginAnalysis(
  data: Record<string, unknown>,
  interactive = false,
): string {
  const items = (data.items ?? []) as Array<Record<string, unknown>>;
  const maxMarginRate = Math.max(
    ...items.map((i) => Number(i.marginRate ?? 0)),
    1,
  );

  const rows = items
    .map((item) => {
      const pct = Math.round(
        (Number(item.marginRate ?? 0) / maxMarginRate) * 100,
      );
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

  const chartSection = interactive
    ? renderChartJsCanvas(
        "marginChart",
        "bar",
        items.map((i) => ({
          label: String(i.product ?? ""),
          value: Number(i.marginRate ?? 0),
        })),
      )
    : "";

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
      ${chartSection}
    </div>`;
}

export function renderCustom(data: Record<string, unknown>): string {
  const rows = Object.entries(data)
    .map(
      ([k, v]) =>
        `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(formatValue(v))}</td></tr>`,
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

export function renderTreemap(data: Record<string, unknown>): string {
  const items = (data.items ?? []) as TreemapItem[];
  if (items.length === 0) {
    return '<div class="section"><p>데이터 없음</p></div>';
  }
  return `<div class="section"><h2>트리맵</h2>${buildTreemapHtml(items)}</div>`;
}

export function renderHeatmap(data: Record<string, unknown>): string {
  const cells = (data.cells ?? []) as HeatmapCell[];
  if (cells.length === 0) {
    return '<div class="section"><p>데이터 없음</p></div>';
  }
  return `<div class="section"><h2>히트맵</h2>${buildHeatmapHtml(cells)}</div>`;
}

export function renderSankey(data: Record<string, unknown>): string {
  const links = (data.links ?? []) as SankeyLink[];
  if (links.length === 0) {
    return '<div class="section"><p>데이터 없음</p></div>';
  }
  return `<div class="section"><h2>자금 흐름</h2>${buildSankeyHtml(links)}</div>`;
}

export function renderBody(
  dashboardType: string,
  data: object,
  interactive = false,
): string {
  const d = data as Record<string, unknown>;
  switch (dashboardType) {
    case "financial_summary":
      return renderFinancialSummary(d, interactive);
    case "aging_report":
      return renderAgingReport(d, interactive);
    case "inventory_pipeline":
      return renderInventoryPipeline(d);
    case "margin_analysis":
      return renderMarginAnalysis(d, interactive);
    case "treemap":
      return renderTreemap(d);
    case "heatmap":
      return renderHeatmap(d);
    case "sankey":
      return renderSankey(d);
    default:
      return renderCustom(d);
  }
}

function renderChartJsCanvas(
  canvasId: string,
  chartType: "bar" | "doughnut" | "line" | "pie" | "radar",
  items: { label: string; value: number }[],
): string {
  const labels = items.map((i) => i.label);
  const values = items.map((i) => i.value);
  const colors = [
    "rgba(79,134,198,0.7)",
    "rgba(39,174,96,0.7)",
    "rgba(243,156,18,0.7)",
    "rgba(231,76,60,0.7)",
    "rgba(155,89,182,0.7)",
    "rgba(52,152,219,0.7)",
    "rgba(46,204,113,0.7)",
    "rgba(230,126,34,0.7)",
  ];
  const bgColors = values.map((_, i) => colors[i % colors.length]);

  const config = buildChartJsConfig(chartType, labels, [
    { label: "값", data: values, backgroundColor: bgColors },
  ]);
  const script = buildChartJsScript(canvasId, config);

  return `<div class="chart-container">
        <canvas id="${canvasId}" role="img" aria-label="차트"></canvas>
      </div>
      ${script}`;
}
