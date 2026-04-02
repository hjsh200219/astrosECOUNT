import { describe, it, expect } from "vitest";
import {
  buildPresentationHtml,
  getPresentationCdnLibs,
  getPresentationExtraStyles,
} from "../../src/utils/slide-renderer.js";

describe("buildPresentationHtml", () => {
  it("should generate Reveal.js slide structure", () => {
    const html = buildPresentationHtml([
      { type: "title", title: "월간 보고" },
      { type: "content", title: "요약", content: "내용입니다" },
    ]);
    expect(html).toContain("reveal");
    expect(html).toContain("slides");
    expect(html).toContain("월간 보고");
    expect(html).toContain("내용입니다");
  });

  it("should render stat slide with large number", () => {
    const html = buildPresentationHtml([
      { type: "stat", title: "매출", statValue: 50000, statLabel: "원" },
    ]);
    expect(html).toContain("50,000");
    expect(html).toContain("stat-value");
    expect(html).toContain("원");
  });

  it("should render chart slide with canvas", () => {
    const html = buildPresentationHtml([
      {
        type: "chart",
        title: "추이",
        chartData: { labels: ["1월", "2월"], values: [100, 200] },
      },
    ]);
    expect(html).toContain("<canvas");
    expect(html).toContain("new Chart");
  });

  it("should render two column slide", () => {
    const html = buildPresentationHtml([
      {
        type: "two_column",
        title: "비교",
        leftContent: "<p>왼쪽</p>",
        rightContent: "<p>오른쪽</p>",
      },
    ]);
    expect(html).toContain("왼쪽");
    expect(html).toContain("오른쪽");
  });

  it("should include navigation controls", () => {
    const html = buildPresentationHtml([{ type: "title", title: "T" }]);
    expect(html).toContain("slide-nav");
    expect(html).toContain("Reveal.prev()");
    expect(html).toContain("Reveal.next()");
    expect(html).toContain("slideCounter");
  });

  it("should initialize Reveal.js", () => {
    const html = buildPresentationHtml([{ type: "title", title: "T" }]);
    expect(html).toContain("Reveal.initialize");
    expect(html).toContain("width:1280");
  });
});

describe("getPresentationCdnLibs", () => {
  it("should always include revealjs", () => {
    const libs = getPresentationCdnLibs([{ type: "title", title: "T" }]);
    expect(libs).toContain("revealjs");
  });

  it("should include chartjs when chart slides exist", () => {
    const libs = getPresentationCdnLibs([
      { type: "chart", title: "C", chartData: { labels: [], values: [] } },
    ]);
    expect(libs).toContain("chartjs");
  });

  it("should not include chartjs when no chart slides", () => {
    const libs = getPresentationCdnLibs([{ type: "content", title: "C" }]);
    expect(libs).not.toContain("chartjs");
  });
});

describe("getPresentationExtraStyles", () => {
  it("should return CSS with stat-value and slide-nav styles", () => {
    const css = getPresentationExtraStyles();
    expect(css).toContain(".stat-value");
    expect(css).toContain(".slide-nav");
  });
});
