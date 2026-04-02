import { escapeHtml } from "./html-helpers.js";

export function generateBarSvg(
  items: { label: string; value: number }[],
): string {
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
      const barHeight = Math.max(
        1,
        Math.round((item.value / maxValue) * chartHeight),
      );
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

export type ChartType = "bar" | "line" | "pie" | "doughnut" | "radar";

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
}

export interface ChartJsConfig {
  type: ChartType;
  data: { labels: string[]; datasets: ChartDataset[] };
  options?: Record<string, unknown>;
}

export function buildChartJsConfig(
  type: ChartType,
  labels: string[],
  datasets: ChartDataset[],
): ChartJsConfig {
  return {
    type,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { tooltip: { enabled: true }, legend: { position: "bottom" } },
    },
  };
}

export function buildChartJsScript(
  canvasId: string,
  config: ChartJsConfig,
): string {
  const json = JSON.stringify(config);
  return `<script>
(function(){
  if(typeof Chart==='undefined'){console.error('Chart.js not loaded');return;}
  var ctx=document.getElementById('${canvasId}');
  if(!ctx)return;
  new Chart(ctx,${json});
})();
</script>`;
}
