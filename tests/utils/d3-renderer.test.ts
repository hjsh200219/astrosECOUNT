import { describe, it, expect } from "vitest";
import {
  buildTreemapHtml,
  buildHeatmapHtml,
  buildSankeyHtml,
} from "../../src/utils/d3-renderer.js";

describe("buildTreemapHtml", () => {
  it("should return HTML with D3 treemap script", () => {
    const html = buildTreemapHtml([
      { label: "A", value: 100 },
      { label: "B", value: 50 },
    ]);
    expect(html).toContain("treemap");
    expect(html).toContain("<script>");
    expect(html).toContain("d3.treemap");
  });

  it("should use custom container id", () => {
    const html = buildTreemapHtml([{ label: "X", value: 10 }], "myTreemap");
    expect(html).toContain('id="myTreemap"');
  });

  it("should include fallback message for missing D3", () => {
    const html = buildTreemapHtml([{ label: "A", value: 1 }]);
    expect(html).toContain("D3.js CDN 로드 실패");
  });
});

describe("buildHeatmapHtml", () => {
  it("should return HTML with D3 heatmap script", () => {
    const html = buildHeatmapHtml([
      { row: "1월", col: "소고기", value: 100 },
      { row: "2월", col: "소고기", value: 200 },
    ]);
    expect(html).toContain("heatmap");
    expect(html).toContain("<script>");
    expect(html).toContain("interpolateBlues");
  });

  it("should include fallback message for missing D3", () => {
    const html = buildHeatmapHtml([{ row: "A", col: "B", value: 1 }]);
    expect(html).toContain("D3.js CDN 로드 실패");
  });
});

describe("buildSankeyHtml", () => {
  it("should return HTML with Sankey diagram script", () => {
    const html = buildSankeyHtml([
      { source: "매입", target: "재고", value: 1000 },
      { source: "재고", target: "매출", value: 800 },
    ]);
    expect(html).toContain("sankey");
    expect(html).toContain("<script>");
    expect(html).toContain("매입");
  });

  it("should include fallback for missing D3", () => {
    const html = buildSankeyHtml([{ source: "A", target: "B", value: 10 }]);
    expect(html).toContain("D3.js CDN 로드 실패");
  });
});
