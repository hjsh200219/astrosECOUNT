import { describe, it, expect } from "vitest";
import {
  listTemplates,
  getTemplate,
  renderTemplate,
  type EmailTemplate,
} from "../../src/tools/email-templates.js";

describe("listTemplates", () => {
  it("should return all 15 templates", () => {
    const templates = listTemplates();
    expect(templates).toHaveLength(15);
  });

  it("should return templates with required fields", () => {
    const templates = listTemplates();
    for (const tpl of templates) {
      expect(tpl.id).toBeDefined();
      expect(tpl.name).toBeDefined();
      expect(tpl.language).toMatch(/^(ko|en|pt)$/);
      expect(tpl.category).toMatch(/^(shipping|contract|docs|customs|alert|delivery|schedule)$/);
      expect(tpl.to).toBeDefined();
      expect(tpl.subject).toBeDefined();
      expect(tpl.body).toBeDefined();
      expect(Array.isArray(tpl.variables)).toBe(true);
    }
  });

  it("should filter by shipping category", () => {
    const templates = listTemplates("shipping");
    expect(templates.length).toBeGreaterThanOrEqual(1);
    expect(templates.every((t) => t.category === "shipping")).toBe(true);
  });

  it("should filter by customs category", () => {
    const templates = listTemplates("customs");
    expect(templates.length).toBeGreaterThanOrEqual(1);
    expect(templates.every((t) => t.category === "customs")).toBe(true);
  });

  it("should filter by docs category", () => {
    const templates = listTemplates("docs");
    expect(templates.length).toBeGreaterThanOrEqual(4);
    expect(templates.every((t) => t.category === "docs")).toBe(true);
  });

  it("should return empty array for unknown category", () => {
    const templates = listTemplates("unknown-category");
    expect(templates).toHaveLength(0);
  });

  it("should cover all 7 categories across templates", () => {
    const allTemplates = listTemplates();
    const categories = new Set(allTemplates.map((t) => t.category));
    expect(categories.has("shipping")).toBe(true);
    expect(categories.has("contract")).toBe(true);
    expect(categories.has("docs")).toBe(true);
    expect(categories.has("customs")).toBe(true);
    expect(categories.has("alert")).toBe(true);
    expect(categories.has("delivery")).toBe(true);
    expect(categories.has("schedule")).toBe(true);
  });
});

describe("getTemplate", () => {
  it("should return TPL-SHIP-01 with correct fields", () => {
    const tpl = getTemplate("TPL-SHIP-01");
    expect(tpl).not.toBeNull();
    expect(tpl!.id).toBe("TPL-SHIP-01");
    expect(tpl!.category).toBe("shipping");
    expect(tpl!.language).toBe("ko");
  });

  it("should return TPL-CONTRACT-01 with English language", () => {
    const tpl = getTemplate("TPL-CONTRACT-01");
    expect(tpl).not.toBeNull();
    expect(tpl!.language).toBe("en");
    expect(tpl!.category).toBe("contract");
  });

  it("should return TPL-DOCS-01 with Portuguese language", () => {
    const tpl = getTemplate("TPL-DOCS-01");
    expect(tpl).not.toBeNull();
    expect(tpl!.language).toBe("pt");
    expect(tpl!.category).toBe("docs");
  });

  it("should return TPL-SCHEDULE-01", () => {
    const tpl = getTemplate("TPL-SCHEDULE-01");
    expect(tpl).not.toBeNull();
    expect(tpl!.category).toBe("schedule");
  });

  it("should return null for invalid ID", () => {
    const tpl = getTemplate("INVALID");
    expect(tpl).toBeNull();
  });

  it("should return null for empty string", () => {
    const tpl = getTemplate("");
    expect(tpl).toBeNull();
  });

  it("should have unique IDs for all templates", () => {
    const templates = listTemplates();
    const ids = templates.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("renderTemplate", () => {
  it("should substitute {{BL_NUMBER}} variable", () => {
    const result = renderTemplate("TPL-SHIP-01", { BL_NUMBER: "MAEU123456789" });
    expect(result).not.toBeNull();
    expect(result!.subject).not.toContain("{{BL_NUMBER}}");
    expect(result!.body).not.toContain("{{BL_NUMBER}}");
    const combined = result!.subject + result!.body;
    if (getTemplate("TPL-SHIP-01")!.variables.includes("BL_NUMBER")) {
      expect(combined).toContain("MAEU123456789");
    }
  });

  it("should substitute multiple variables in body", () => {
    const tpl = getTemplate("TPL-CUSTOMS-01");
    expect(tpl).not.toBeNull();
    const data: Record<string, string> = {};
    for (const v of tpl!.variables) {
      data[v] = `TEST_${v}`;
    }
    const result = renderTemplate("TPL-CUSTOMS-01", data);
    expect(result).not.toBeNull();
    const combined = result!.subject + " " + result!.body;
    expect(combined).not.toMatch(/\{\{[A-Z_]+\}\}/);
  });

  it("should leave unmatched variables as-is", () => {
    const result = renderTemplate("TPL-SHIP-01", {});
    expect(result).not.toBeNull();
    // Variables not provided should remain as {{VAR_NAME}}
    const tpl = getTemplate("TPL-SHIP-01")!;
    if (tpl.variables.length > 0) {
      const combined = result!.subject + " " + result!.body;
      expect(combined).toContain(`{{${tpl.variables[0]}}}` );
    }
  });

  it("should return null for invalid template ID", () => {
    const result = renderTemplate("TPL-NONEXISTENT", { FOO: "bar" });
    expect(result).toBeNull();
  });

  it("should render subject and body as separate strings", () => {
    const tpl = getTemplate("TPL-DELIVERY-01")!;
    const data: Record<string, string> = {};
    for (const v of tpl.variables) data[v] = `VAL_${v}`;
    const result = renderTemplate("TPL-DELIVERY-01", data);
    expect(result).not.toBeNull();
    expect(typeof result!.subject).toBe("string");
    expect(typeof result!.body).toBe("string");
    expect(result!.subject.length).toBeGreaterThan(0);
    expect(result!.body.length).toBeGreaterThan(0);
  });

  it("should render all templates without throwing", () => {
    const templates = listTemplates();
    for (const tpl of templates) {
      const data: Record<string, string> = {};
      for (const v of tpl.variables) data[v] = `TEST_${v}`;
      expect(() => renderTemplate(tpl.id, data)).not.toThrow();
    }
  });

  it("should list variables for TPL-SHIP-01 including BL_NUMBER", () => {
    const tpl = getTemplate("TPL-SHIP-01")!;
    expect(tpl.variables).toContain("BL_NUMBER");
  });
});

describe("registerEmailTemplateTools", () => {
  it("should register email template tools without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerEmailTemplateTools } = await import("../../src/tools/email-templates.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerEmailTemplateTools(server)).not.toThrow();
  });
});
