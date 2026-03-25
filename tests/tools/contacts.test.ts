import { describe, it, expect } from "vitest";
import {
  lookupContact,
  listContacts,
  type Contact,
} from "../../src/tools/contacts.js";

describe("lookupContact", () => {
  it("should find contact by name (Korean)", () => {
    const result = lookupContact("김민수");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("김민수");
    expect(result!.company).toBe("삼현INT");
  });

  it("should find contact by company", () => {
    const results = listContacts({ company: "정운관세법인" });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((c) => c.company === "정운관세법인")).toBe(true);
  });

  it("should find contact by role", () => {
    const results = listContacts({ role: "관세사" });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("should return null for unknown contact", () => {
    const result = lookupContact("존재하지않는사람");
    expect(result).toBeNull();
  });

  it("should return all contacts when no filter", () => {
    const results = listContacts({});
    expect(results.length).toBeGreaterThanOrEqual(10);
  });
});

describe("registerContactTools", () => {
  it("should register contact tools without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerContactTools } = await import("../../src/tools/contacts.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerContactTools(server)).not.toThrow();
  });
});
