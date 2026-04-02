import { describe, it, expect } from "vitest";
import { buildHtmlDocument } from "../../src/utils/html-builder.js";

describe("buildHtmlDocument", () => {
  it("should return complete HTML document with DOCTYPE", () => {
    const html = buildHtmlDocument({
      title: "테스트",
      body: "<p>Hello</p>",
    });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(html).toContain("테스트");
    expect(html).toContain("<p>Hello</p>");
  });

  it("should set language attribute", () => {
    const ko = buildHtmlDocument({
      title: "T",
      body: "",
      language: "ko",
    });
    const en = buildHtmlDocument({
      title: "T",
      body: "",
      language: "en",
    });
    expect(ko).toContain('lang="ko"');
    expect(en).toContain('lang="en"');
  });

  it("should default to Korean language", () => {
    const html = buildHtmlDocument({ title: "T", body: "" });
    expect(html).toContain('lang="ko"');
  });

  it("should include CDN scripts when specified", () => {
    const html = buildHtmlDocument({
      title: "T",
      body: "",
      cdnLibs: ["chartjs"],
    });
    expect(html).toContain("chart.js");
    expect(html).toContain("Chart.defaults.animation=false");
  });

  it("should not include Chart.js init when chartjs not in cdnLibs", () => {
    const html = buildHtmlDocument({
      title: "T",
      body: "",
      cdnLibs: ["mermaid"],
    });
    expect(html).not.toContain("Chart.defaults.animation");
    expect(html).toContain("mermaid");
  });

  it("should include base CSS", () => {
    const html = buildHtmlDocument({ title: "T", body: "" });
    expect(html).toContain("<style>");
    expect(html).toContain("@media print");
    expect(html).toContain("@media (max-width: 600px)");
  });

  it("should include extra styles and scripts", () => {
    const html = buildHtmlDocument({
      title: "T",
      body: "",
      extraStyles: ".custom { color: red; }",
      extraScripts: "<script>alert(1);</script>",
    });
    expect(html).toContain(".custom { color: red; }");
    expect(html).toContain("<script>alert(1);</script>");
  });

  it("should escape title HTML", () => {
    const html = buildHtmlDocument({
      title: '<script>alert("xss")</script>',
      body: "",
    });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });
});
