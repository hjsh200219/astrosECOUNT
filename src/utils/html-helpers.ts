export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatNumber(n: unknown): string {
  if (typeof n !== "number" || isNaN(n)) return String(n ?? "");
  return n.toLocaleString();
}

export function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "number") return formatNumber(v);
  return String(v);
}

export function defaultTitle(
  dashboardType: string,
  language: "ko" | "en",
): string {
  const titles: Record<string, Record<string, string>> = {
    financial_summary: { ko: "재무 요약", en: "Financial Summary" },
    aging_report: { ko: "채권 연령 분석", en: "Aging Report" },
    inventory_pipeline: { ko: "재고 파이프라인", en: "Inventory Pipeline" },
    margin_analysis: { ko: "마진 분석", en: "Margin Analysis" },
    treemap: { ko: "트리맵", en: "Treemap" },
    heatmap: { ko: "히트맵", en: "Heatmap" },
    sankey: { ko: "자금 흐름", en: "Sankey Diagram" },
    custom: { ko: "대시보드", en: "Dashboard" },
  };
  return (
    titles[dashboardType]?.[language] ??
    (language === "ko" ? "대시보드" : "Dashboard")
  );
}
