import { type CdnLibrary, getCdnScripts } from "./cdn-loader.js";
import { escapeHtml } from "./html-helpers.js";

export interface HtmlDocumentOptions {
  title: string;
  language?: "ko" | "en";
  body: string;
  cdnLibs?: CdnLibrary[];
  extraHeadHtml?: string;
  extraStyles?: string;
  extraScripts?: string;
}

const BASE_CSS = `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
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
.chart-container { position: relative; height: 300px; margin-bottom: 16px; }
@media print {
  body { background: #fff; padding: 0; }
  .kpi-card, .section { box-shadow: none; border: 1px solid #ddd; }
  .pipeline-stage { border-right: 1px solid #ccc; }
}
@media (max-width: 600px) {
  .kpi-grid, .aging-grid, .pipeline { flex-direction: column; }
}`;

export function buildHtmlDocument(opts: HtmlDocumentOptions): string {
  const lang = opts.language ?? "ko";
  const cdnTags = opts.cdnLibs?.length ? getCdnScripts(opts.cdnLibs) : "";
  const chartJsInit =
    opts.cdnLibs?.includes("chartjs")
      ? "<script>if(typeof Chart!=='undefined')Chart.defaults.animation=false;</script>"
      : "";
  const extraStyles = opts.extraStyles ? `\n${opts.extraStyles}` : "";

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${escapeHtml(opts.title)}</title>
${cdnTags}
${chartJsInit}
${opts.extraHeadHtml ?? ""}
<style>
  ${BASE_CSS}${extraStyles}
</style>
</head>
<body>
<h1>${escapeHtml(opts.title)}</h1>
${opts.body}
${opts.extraScripts ?? ""}
</body>
</html>`;
}
