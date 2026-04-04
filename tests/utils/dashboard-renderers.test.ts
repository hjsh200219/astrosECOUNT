import { describe, it, expect } from "vitest";
import {
  renderFinancialSummary,
  renderAgingReport,
  renderInventoryPipeline,
  renderMarginAnalysis,
  renderCustom,
  renderTreemap,
  renderHeatmap,
  renderSankey,
  renderBody,
} from "../../src/utils/dashboard-renderers.js";

describe("renderFinancialSummary", () => {
  it("should render KPI cards for revenue/cost/profit", () => {
    const html = renderFinancialSummary({ revenue: 1000000, cost: 600000, profit: 400000 });
    expect(html).toContain("kpi-card");
    expect(html).toContain("매출");
    expect(html).toContain("비용");
    expect(html).toContain("이익");
  });

  it("should format marginRate with percent sign", () => {
    const html = renderFinancialSummary({ marginRate: 35 });
    expect(html).toContain("35%");
  });

  it("should include extra KPIs not in the standard order", () => {
    const html = renderFinancialSummary({ revenue: 100, customField: 42 });
    expect(html).toContain("customField");
  });
});

describe("renderAgingReport", () => {
  it("should render aging buckets", () => {
    const html = renderAgingReport({ current: 500, "1_30": 200, "31_60": 100 });
    expect(html).toContain("aging-bucket");
    expect(html).toContain("현재");
    expect(html).toContain("1-30일");
  });

  it("should skip missing buckets", () => {
    const html = renderAgingReport({ current: 100 });
    expect(html).not.toContain("90일+");
  });
});

describe("renderInventoryPipeline", () => {
  it("should render all 5 stages", () => {
    const html = renderInventoryPipeline({ "계약": 10, "미착": 5, "도착": 3, "상품": 20, "판매완료": 15 });
    expect(html).toContain("계약");
    expect(html).toContain("미착");
    expect(html).toContain("도착");
    expect(html).toContain("상품");
    expect(html).toContain("판매완료");
  });

  it("should show dash for missing stage values", () => {
    const html = renderInventoryPipeline({});
    expect(html).toContain("-");
  });
});

describe("renderMarginAnalysis", () => {
  it("should render table rows for items", () => {
    const data = {
      items: [
        { product: "닭다리", revenue: 1000, cost: 600, margin: 400, marginRate: 40 },
      ],
    };
    const html = renderMarginAnalysis(data);
    expect(html).toContain("닭다리");
    expect(html).toContain("마진 분석");
    expect(html).toContain("bar-fill");
  });

  it("should handle empty items array", () => {
    const html = renderMarginAnalysis({ items: [] });
    expect(html).toContain("<tbody>");
  });
});

describe("renderCustom", () => {
  it("should render key-value table", () => {
    const html = renderCustom({ name: "test", count: 5 });
    expect(html).toContain("name");
    expect(html).toContain("test");
    expect(html).toContain("kv-table");
  });
});

describe("renderTreemap", () => {
  it("should return empty message when no items", () => {
    const html = renderTreemap({});
    expect(html).toContain("데이터 없음");
  });

  it("should render treemap when items provided", () => {
    const html = renderTreemap({ items: [{ name: "A", value: 100 }] });
    expect(html).toContain("트리맵");
  });
});

describe("renderHeatmap", () => {
  it("should return empty message when no cells", () => {
    const html = renderHeatmap({});
    expect(html).toContain("데이터 없음");
  });

  it("should render heatmap when cells provided", () => {
    const html = renderHeatmap({ cells: [{ row: "A", col: "B", value: 10 }] });
    expect(html).toContain("히트맵");
  });
});

describe("renderSankey", () => {
  it("should return empty message when no links", () => {
    const html = renderSankey({});
    expect(html).toContain("데이터 없음");
  });

  it("should render sankey when links provided", () => {
    const html = renderSankey({ links: [{ source: "A", target: "B", value: 50 }] });
    expect(html).toContain("자금 흐름");
  });
});

describe("renderBody", () => {
  it("should dispatch financial_summary type", () => {
    const html = renderBody("financial_summary", { revenue: 100 });
    expect(html).toContain("매출");
  });

  it("should dispatch aging_report type", () => {
    const html = renderBody("aging_report", { current: 100 });
    expect(html).toContain("연령 분석");
  });

  it("should dispatch inventory_pipeline type", () => {
    const html = renderBody("inventory_pipeline", { "계약": 5 });
    expect(html).toContain("재고 파이프라인");
  });

  it("should fall back to custom for unknown type", () => {
    const html = renderBody("unknown_type", { key: "val" });
    expect(html).toContain("kv-table");
  });
});
