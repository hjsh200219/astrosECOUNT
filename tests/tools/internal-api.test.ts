import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerInternalApiTools, INTERNAL_ENDPOINTS } from "../../src/tools/internal-api.js";
import { EcountClient } from "../../src/client/ecount-client.js";

const mockConfig = {
  ECOUNT_COM_CODE: "TEST",
  ECOUNT_USER_ID: "user",
  ECOUNT_API_CERT_KEY: "key123",
  ECOUNT_ZONE: "AU1",
  ECOUNT_LAN_TYPE: "ko-KR",
};

describe("registerInternalApiTools", () => {
  it("should register 4 internal API tools without throwing", () => {
    const server = new McpServer({ name: "test", version: "0.1" });
    const client = new EcountClient(mockConfig);
    expect(() => registerInternalApiTools(server, client)).not.toThrow();
  });

  it("should register exactly 4 tools", () => {
    const server = new McpServer({ name: "test", version: "0.1" });
    const toolSpy = vi.spyOn(server, "tool");
    const client = new EcountClient(mockConfig);

    registerInternalApiTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(4);
  });

  it("should register tools with correct names", () => {
    const server = new McpServer({ name: "test", version: "0.1" });
    const toolNames: string[] = [];
    vi.spyOn(server, "tool").mockImplementation((...args: unknown[]) => {
      toolNames.push(args[0] as string);
      return undefined as unknown as ReturnType<typeof server.tool>;
    });
    const client = new EcountClient(mockConfig);

    registerInternalApiTools(server, client);

    expect(toolNames).toContain("ecount_list_sales_internal");
    expect(toolNames).toContain("ecount_list_purchases_internal");
    expect(toolNames).toContain("ecount_list_vatslips");
    expect(toolNames).toContain("ecount_list_account_slips");
  });

  it("should have all tools as read-only", () => {
    const server = new McpServer({ name: "test", version: "0.1" });
    const annotations: unknown[] = [];
    vi.spyOn(server, "tool").mockImplementation((...args: unknown[]) => {
      // args: [name, description, schema, annotations, handler]
      // annotations is the 4th arg (index 3)
      annotations.push(args[3]);
      return undefined as unknown as ReturnType<typeof server.tool>;
    });
    const client = new EcountClient(mockConfig);

    registerInternalApiTools(server, client);

    for (const ann of annotations) {
      expect((ann as { readOnlyHint?: boolean }).readOnlyHint).toBe(true);
    }
  });

  it("should export INTERNAL_ENDPOINTS constant with 4 entries", () => {
    expect(INTERNAL_ENDPOINTS).toBeDefined();
    expect(INTERNAL_ENDPOINTS.SALES).toBe("/Account/GetSaleSlipStatusList");
    expect(INTERNAL_ENDPOINTS.PURCHASES).toBe("/Account/GetPurchaseSlipStatusList");
    expect(INTERNAL_ENDPOINTS.VAT_SLIPS).toBe("/Account/GetInvoiceAutoList");
    expect(INTERNAL_ENDPOINTS.ACCOUNT_SLIPS).toBe("/Account/GetAccountSlipList");
  });

  it("should call client.postRaw when ecount_list_sales_internal is invoked", async () => {
    const server = new McpServer({ name: "test", version: "0.1" });
    const client = new EcountClient(mockConfig);
    const postRawSpy = vi
      .spyOn(client, "postRaw")
      .mockResolvedValue({ data: [] });

    registerInternalApiTools(server, client);

    // Extract the handler registered for ecount_list_sales_internal
    const handlers: Array<{ name: string; handler: (p: Record<string, unknown>) => Promise<unknown> }> = [];
    const captureServer = new McpServer({ name: "capture", version: "0.1" });
    vi.spyOn(captureServer, "tool").mockImplementation((...args: unknown[]) => {
      handlers.push({
        name: args[0] as string,
        handler: args[4] as (p: Record<string, unknown>) => Promise<unknown>,
      });
      return undefined as unknown as ReturnType<typeof server.tool>;
    });
    registerInternalApiTools(captureServer, client);

    const salesHandler = handlers.find((h) => h.name === "ecount_list_sales_internal");
    expect(salesHandler).toBeDefined();

    await salesHandler!.handler({
      from_date: "20240101",
      to_date: "20240131",
      page: 1,
      per_page: 20,
    });

    expect(postRawSpy).toHaveBeenCalledWith(
      INTERNAL_ENDPOINTS.SALES,
      expect.objectContaining({
        FROM_DATE: "20240101",
        TO_DATE: "20240131",
        PAGE: 1,
        PER_PAGE: 20,
      })
    );
  });

  it("should call client.postRaw with correct endpoint for ecount_list_purchases_internal", async () => {
    const client = new EcountClient(mockConfig);
    const postRawSpy = vi
      .spyOn(client, "postRaw")
      .mockResolvedValue({ data: [] });

    const server = new McpServer({ name: "capture2", version: "0.1" });
    const handlers: Array<{ name: string; handler: (p: Record<string, unknown>) => Promise<unknown> }> = [];
    vi.spyOn(server, "tool").mockImplementation((...args: unknown[]) => {
      handlers.push({
        name: args[0] as string,
        handler: args[4] as (p: Record<string, unknown>) => Promise<unknown>,
      });
      return undefined as unknown as ReturnType<typeof server.tool>;
    });
    registerInternalApiTools(server, client);

    const handler = handlers.find((h) => h.name === "ecount_list_purchases_internal");
    expect(handler).toBeDefined();

    await handler!.handler({
      from_date: "20240101",
      to_date: "20240131",
      page: 1,
      per_page: 20,
    });

    expect(postRawSpy).toHaveBeenCalledWith(
      INTERNAL_ENDPOINTS.PURCHASES,
      expect.anything()
    );
  });

  it("should call client.postRaw with correct endpoint for ecount_list_vatslips", async () => {
    const client = new EcountClient(mockConfig);
    const postRawSpy = vi
      .spyOn(client, "postRaw")
      .mockResolvedValue({ data: [] });

    const server = new McpServer({ name: "capture3", version: "0.1" });
    const handlers: Array<{ name: string; handler: (p: Record<string, unknown>) => Promise<unknown> }> = [];
    vi.spyOn(server, "tool").mockImplementation((...args: unknown[]) => {
      handlers.push({
        name: args[0] as string,
        handler: args[4] as (p: Record<string, unknown>) => Promise<unknown>,
      });
      return undefined as unknown as ReturnType<typeof server.tool>;
    });
    registerInternalApiTools(server, client);

    const handler = handlers.find((h) => h.name === "ecount_list_vatslips");
    expect(handler).toBeDefined();

    await handler!.handler({
      from_date: "20240101",
      to_date: "20240131",
      slip_type: "1",
      page: 1,
      per_page: 20,
    });

    expect(postRawSpy).toHaveBeenCalledWith(
      INTERNAL_ENDPOINTS.VAT_SLIPS,
      expect.objectContaining({ SLIP_TYPE: "1" })
    );
  });

  it("should call client.postRaw with correct endpoint for ecount_list_account_slips", async () => {
    const client = new EcountClient(mockConfig);
    const postRawSpy = vi
      .spyOn(client, "postRaw")
      .mockResolvedValue({ data: [] });

    const server = new McpServer({ name: "capture4", version: "0.1" });
    const handlers: Array<{ name: string; handler: (p: Record<string, unknown>) => Promise<unknown> }> = [];
    vi.spyOn(server, "tool").mockImplementation((...args: unknown[]) => {
      handlers.push({
        name: args[0] as string,
        handler: args[4] as (p: Record<string, unknown>) => Promise<unknown>,
      });
      return undefined as unknown as ReturnType<typeof server.tool>;
    });
    registerInternalApiTools(server, client);

    const handler = handlers.find((h) => h.name === "ecount_list_account_slips");
    expect(handler).toBeDefined();

    await handler!.handler({
      from_date: "20240101",
      to_date: "20240131",
      page: 1,
      per_page: 20,
    });

    expect(postRawSpy).toHaveBeenCalledWith(
      INTERNAL_ENDPOINTS.ACCOUNT_SLIPS,
      expect.anything()
    );
  });

  it("should handle postRaw errors gracefully", async () => {
    const client = new EcountClient(mockConfig);
    vi.spyOn(client, "postRaw").mockRejectedValue(new Error("Connection failed"));

    const server = new McpServer({ name: "err-test", version: "0.1" });
    const handlers: Array<{ name: string; handler: (p: Record<string, unknown>) => Promise<unknown> }> = [];
    vi.spyOn(server, "tool").mockImplementation((...args: unknown[]) => {
      handlers.push({
        name: args[0] as string,
        handler: args[4] as (p: Record<string, unknown>) => Promise<unknown>,
      });
      return undefined as unknown as ReturnType<typeof server.tool>;
    });
    registerInternalApiTools(server, client);

    const handler = handlers.find((h) => h.name === "ecount_list_sales_internal");
    const result = await handler!.handler({
      from_date: "20240101",
      to_date: "20240131",
      page: 1,
      per_page: 20,
    });

    expect((result as { isError?: boolean }).isError).toBe(true);
  });
});
