import { describe, it, expect } from "vitest";
import {
  buildWorkflowDiagram,
  buildStateDiagram,
  buildSequenceDiagram,
  buildErDiagram,
  buildGanttDiagram,
  wrapMermaidHtml,
} from "../../src/utils/mermaid-renderer.js";

describe("buildWorkflowDiagram", () => {
  it("should generate LR flowchart with arrows", () => {
    const result = buildWorkflowDiagram([
      { id: "A", label: "견적" },
      { id: "B", label: "수주" },
      { id: "C", label: "출고" },
    ]);
    expect(result).toContain("graph LR");
    expect(result).toContain('A["견적"]');
    expect(result).toContain("A --> B");
    expect(result).toContain("B --> C");
  });

  it("should return empty string for empty stages", () => {
    expect(buildWorkflowDiagram([])).toBe("");
  });
});

describe("buildStateDiagram", () => {
  it("should generate state transitions", () => {
    const result = buildStateDiagram(
      ["계약", "미착", "도착"],
      [
        { from: "계약", to: "미착", label: "발주" },
        { from: "미착", to: "도착" },
      ],
    );
    expect(result).toContain("stateDiagram-v2");
    expect(result).toContain("계약 --> 미착 : 발주");
    expect(result).toContain("미착 --> 도착");
  });
});

describe("buildSequenceDiagram", () => {
  it("should generate sequence with participants and messages", () => {
    const result = buildSequenceDiagram(
      ["Client", "Server"],
      [{ from: "Client", to: "Server", message: "요청" }],
    );
    expect(result).toContain("sequenceDiagram");
    expect(result).toContain("participant Client");
    expect(result).toContain("Client->>+Server: 요청");
  });
});

describe("buildErDiagram", () => {
  it("should generate ER diagram with entities and relations", () => {
    const result = buildErDiagram(
      [{ name: "Product", attributes: ["code", "name"] }],
      [{ from: "Product", to: "Inventory", label: "보유" }],
    );
    expect(result).toContain("erDiagram");
    expect(result).toContain("Product {");
    expect(result).toContain("string code");
    expect(result).toContain('Product ||--o{ Inventory : "보유"');
  });
});

describe("buildGanttDiagram", () => {
  it("should generate Gantt chart with sections", () => {
    const result = buildGanttDiagram([
      { name: "마감", start: "2025-01-01", end: "2025-01-05", section: "회계" },
      { name: "검토", start: "2025-01-06", end: "2025-01-07", section: "회계" },
    ]);
    expect(result).toContain("gantt");
    expect(result).toContain("section 회계");
    expect(result).toContain("마감 :2025-01-01, 2025-01-05");
  });

  it("should use default section for tasks without section", () => {
    const result = buildGanttDiagram([
      { name: "작업", start: "2025-01-01", end: "2025-01-02" },
    ]);
    expect(result).toContain("section 기본");
  });
});

describe("wrapMermaidHtml", () => {
  it("should wrap definition in pre.mermaid tag", () => {
    const result = wrapMermaidHtml("graph LR\n  A --> B");
    expect(result).toContain('<pre class="mermaid">');
    expect(result).toContain("graph LR");
    expect(result).toContain("</pre>");
  });
});
