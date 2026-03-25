import { describe, it, expect } from "vitest";
import { toCsv } from "../../src/tools/csv-export.js";

describe("toCsv", () => {
  it("should generate basic CSV with header", () => {
    const data = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    const result = toCsv(data);
    const lines = result.split("\n");
    expect(lines[0]).toBe("name,age");
    expect(lines[1]).toBe("Alice,30");
    expect(lines[2]).toBe("Bob,25");
  });

  it("should generate CSV without header when includeHeader is false", () => {
    const data = [{ name: "Alice", age: 30 }];
    const result = toCsv(data, { includeHeader: false });
    const lines = result.split("\n");
    expect(lines[0]).toBe("Alice,30");
    expect(lines).toHaveLength(1);
  });

  it("should use custom delimiter (tab)", () => {
    const data = [{ name: "Alice", age: 30 }];
    const result = toCsv(data, { delimiter: "\t" });
    const lines = result.split("\n");
    expect(lines[0]).toBe("name\tage");
    expect(lines[1]).toBe("Alice\t30");
  });

  it("should respect column selection and ordering", () => {
    const data = [
      { name: "Alice", age: 30, city: "Seoul" },
      { name: "Bob", age: 25, city: "Busan" },
    ];
    const result = toCsv(data, { columns: ["city", "name"] });
    const lines = result.split("\n");
    expect(lines[0]).toBe("city,name");
    expect(lines[1]).toBe("Seoul,Alice");
    expect(lines[2]).toBe("Busan,Bob");
  });

  it("should wrap values containing commas in double quotes", () => {
    const data = [{ product: "Chicken, Breast", price: 10 }];
    const result = toCsv(data);
    const lines = result.split("\n");
    expect(lines[1]).toBe('"Chicken, Breast",10');
  });

  it("should escape internal double-quotes by doubling them", () => {
    const data = [{ note: 'He said "hello"' }];
    const result = toCsv(data);
    const lines = result.split("\n");
    expect(lines[1]).toBe('"He said ""hello"""');
  });

  it("should convert null values to empty string", () => {
    const data = [{ name: "Alice", age: null }];
    const result = toCsv(data as unknown as Record<string, unknown>[]);
    const lines = result.split("\n");
    expect(lines[1]).toBe("Alice,");
  });

  it("should convert undefined values to empty string", () => {
    const data = [{ name: "Alice", age: undefined }];
    const result = toCsv(data as unknown as Record<string, unknown>[]);
    const lines = result.split("\n");
    expect(lines[1]).toBe("Alice,");
  });

  it("should return header only for empty data array", () => {
    const result = toCsv([], { columns: ["name", "age"] });
    expect(result).toBe("name,age");
  });

  it("should return empty string for empty data with no columns and no header", () => {
    const result = toCsv([], { includeHeader: false });
    expect(result).toBe("");
  });
});

describe("registerCsvExportTools", () => {
  it("should register tools without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerCsvExportTools } = await import("../../src/tools/csv-export.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerCsvExportTools(server)).not.toThrow();
  });
});
