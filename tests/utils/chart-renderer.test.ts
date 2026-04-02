import { describe, it, expect } from "vitest";
import {
  generateBarSvg,
  buildChartJsConfig,
  buildChartJsScript,
} from "../../src/utils/chart-renderer.js";

describe("generateBarSvg", () => {
  it("should return valid SVG with rect elements", () => {
    const items = [
      { label: "매출", value: 1000 },
      { label: "비용", value: 600 },
      { label: "이익", value: 400 },
    ];
    const svg = generateBarSvg(items);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("<rect");
    expect((svg.match(/<rect/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it("should handle empty items", () => {
    const svg = generateBarSvg([]);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("should handle single item", () => {
    const svg = generateBarSvg([{ label: "테스트", value: 500 }]);
    expect(svg).toContain("<rect");
    expect(svg).toContain("테스트");
  });
});

describe("buildChartJsConfig", () => {
  it("should build a valid chart config", () => {
    const config = buildChartJsConfig(
      "bar",
      ["A", "B"],
      [{ label: "Series", data: [10, 20] }],
    );
    expect(config.type).toBe("bar");
    expect(config.data.labels).toEqual(["A", "B"]);
    expect(config.data.datasets[0].data).toEqual([10, 20]);
  });

  it("should include responsive and tooltip options", () => {
    const config = buildChartJsConfig("line", ["X"], [{ label: "Y", data: [1] }]);
    expect(config.options).toBeDefined();
    expect((config.options as Record<string, unknown>).responsive).toBe(true);
    expect((config.options as Record<string, unknown>).maintainAspectRatio).toBe(false);
  });
});

describe("buildChartJsScript", () => {
  it("should return a script tag with Chart constructor", () => {
    const config = buildChartJsConfig("bar", ["A"], [{ label: "S", data: [1] }]);
    const script = buildChartJsScript("myChart", config);
    expect(script).toContain("<script>");
    expect(script).toContain("new Chart");
    expect(script).toContain("myChart");
  });

  it("should include Chart.js availability check", () => {
    const config = buildChartJsConfig("pie", [], []);
    const script = buildChartJsScript("c1", config);
    expect(script).toContain("typeof Chart==='undefined'");
  });
});
