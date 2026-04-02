import { describe, it, expect } from "vitest";
import {
  buildScriptTag,
  buildLinkTag,
  getCdnScripts,
  getCdnUrl,
} from "../../src/utils/cdn-loader.js";

describe("buildScriptTag", () => {
  it("should return a script tag with src", () => {
    expect(buildScriptTag("https://example.com/lib.js")).toBe(
      '<script src="https://example.com/lib.js"></script>',
    );
  });

  it("should add type=module when isModule is true", () => {
    expect(buildScriptTag("https://example.com/lib.js", true)).toBe(
      '<script src="https://example.com/lib.js" type="module"></script>',
    );
  });
});

describe("buildLinkTag", () => {
  it("should return a stylesheet link tag", () => {
    expect(buildLinkTag("https://example.com/style.css")).toBe(
      '<link rel="stylesheet" href="https://example.com/style.css"/>',
    );
  });
});

describe("getCdnScripts", () => {
  it("should return script tags for requested libraries", () => {
    const result = getCdnScripts(["chartjs"]);
    expect(result).toContain("chart.js");
    expect(result).toContain("<script");
  });

  it("should include both CSS and JS for leaflet", () => {
    const result = getCdnScripts(["leaflet"]);
    expect(result).toContain("leaflet.css");
    expect(result).toContain("leaflet.js");
    expect(result).toContain("<link");
    expect(result).toContain("<script");
  });

  it("should use type=module for threejs", () => {
    const result = getCdnScripts(["threejs"]);
    expect(result).toContain('type="module"');
  });

  it("should combine multiple libraries", () => {
    const result = getCdnScripts(["chartjs", "mermaid"]);
    expect(result).toContain("chart.js");
    expect(result).toContain("mermaid");
  });

  it("should return empty string for empty array", () => {
    expect(getCdnScripts([])).toBe("");
  });
});

describe("getCdnUrl", () => {
  it("should return primary script URL for a library", () => {
    expect(getCdnUrl("chartjs")).toContain("chart.js");
    expect(getCdnUrl("d3")).toContain("d3@7");
  });

  it("should return empty string for unknown library", () => {
    expect(getCdnUrl("nonexistent" as never)).toBe("");
  });
});
