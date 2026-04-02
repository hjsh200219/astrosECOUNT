export type CdnLibrary =
  | "chartjs"
  | "d3"
  | "mermaid"
  | "threejs"
  | "leaflet"
  | "revealjs"
  | "html-to-image";

const CDN_URLS: Record<CdnLibrary, { scripts: string[]; styles: string[] }> = {
  chartjs: {
    scripts: [
      "https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js",
    ],
    styles: [],
  },
  d3: {
    scripts: ["https://cdn.jsdelivr.net/npm/d3@7"],
    styles: [],
  },
  mermaid: {
    scripts: [
      "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js",
    ],
    styles: [],
  },
  threejs: {
    scripts: [
      "https://cdn.jsdelivr.net/npm/three@0.170/build/three.module.min.js",
    ],
    styles: [],
  },
  leaflet: {
    scripts: ["https://cdn.jsdelivr.net/npm/leaflet@1/dist/leaflet.js"],
    styles: ["https://cdn.jsdelivr.net/npm/leaflet@1/dist/leaflet.css"],
  },
  revealjs: {
    scripts: ["https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.js"],
    styles: [
      "https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css",
      "https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/white.css",
    ],
  },
  "html-to-image": {
    scripts: [
      "https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js",
    ],
    styles: [],
  },
};

export function buildScriptTag(url: string, isModule = false): string {
  const typeAttr = isModule ? ' type="module"' : "";
  return `<script src="${url}"${typeAttr}></script>`;
}

export function buildLinkTag(url: string): string {
  return `<link rel="stylesheet" href="${url}"/>`;
}

export function getCdnScripts(libs: CdnLibrary[]): string {
  const parts: string[] = [];
  for (const lib of libs) {
    const entry = CDN_URLS[lib];
    if (!entry) continue;
    for (const css of entry.styles) parts.push(buildLinkTag(css));
    const isModule = lib === "threejs";
    for (const js of entry.scripts) parts.push(buildScriptTag(js, isModule));
  }
  return parts.join("\n");
}

export function getCdnUrl(lib: CdnLibrary): string {
  return CDN_URLS[lib]?.scripts[0] ?? "";
}
