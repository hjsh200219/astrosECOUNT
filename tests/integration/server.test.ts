import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("Server Integration", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("createServer", () => {
    it("should create server and register all 59 tools with valid config", async () => {
      process.env.ECOUNT_COM_CODE = "TESTCO";
      process.env.ECOUNT_USER_ID = "testuser";
      process.env.ECOUNT_API_CERT_KEY = "testkey123";
      process.env.ECOUNT_ZONE = "AU1";
      process.env.ECOUNT_LAN_TYPE = "ko-KR";

      // Dynamic import to pick up env changes
      const { createServer } = await import("../../src/server.js");
      const server = createServer();

      expect(server).toBeInstanceOf(McpServer);

      // Count registered tools by spying on a fresh server
      const server2 = new McpServer({ name: "count-test", version: "0.1" });
      const toolSpy = vi.spyOn(server2, "tool");

      const { registerAllTools } = await import("../../src/tools/index.js");
      const { EcountClient } = await import(
        "../../src/client/ecount-client.js"
      );
      const client = new EcountClient({
        ECOUNT_COM_CODE: "TESTCO",
        ECOUNT_USER_ID: "testuser",
        ECOUNT_API_CERT_KEY: "testkey123",
        ECOUNT_ZONE: "AU1",
        ECOUNT_LAN_TYPE: "ko-KR",
      });

      registerAllTools(server2, client);

      // 2 connection + 11 master-data + 12 sales + 7 purchase
      // + 8 inventory + 6 production + 10 accounting + 3 other = 59
      expect(toolSpy).toHaveBeenCalledTimes(59);
    });

    it("should verify all 8 tool categories are registered", async () => {
      const server = new McpServer({ name: "cat-test", version: "0.1" });
      const toolNames: string[] = [];
      const toolSpy = vi
        .spyOn(server, "tool")
        .mockImplementation((...args: unknown[]) => {
          toolNames.push(args[0] as string);
          return undefined as unknown as ReturnType<typeof server.tool>;
        });

      const { registerAllTools } = await import("../../src/tools/index.js");
      const { EcountClient } = await import(
        "../../src/client/ecount-client.js"
      );
      const client = new EcountClient({
        ECOUNT_COM_CODE: "TESTCO",
        ECOUNT_USER_ID: "testuser",
        ECOUNT_API_CERT_KEY: "testkey123",
        ECOUNT_ZONE: "AU1",
        ECOUNT_LAN_TYPE: "ko-KR",
      });

      registerAllTools(server, client);
      toolSpy.mockRestore();

      // Connection tools
      expect(toolNames).toContain("ecount_login");
      expect(toolNames).toContain("ecount_status");

      // Master-data tools
      expect(toolNames).toContain("ecount_save_product");
      expect(toolNames).toContain("ecount_list_customers");

      // Sales tools
      expect(toolNames).toContain("ecount_save_sale");
      expect(toolNames).toContain("ecount_list_quotations");

      // Purchase tools
      expect(toolNames).toContain("ecount_save_purchase");
      expect(toolNames).toContain("ecount_list_purchase_orders");

      // Inventory tools
      expect(toolNames).toContain("ecount_list_inventory_by_product");
      expect(toolNames).toContain("ecount_save_barcode_scan");

      // Production tools
      expect(toolNames).toContain("ecount_save_production_order");
      expect(toolNames).toContain("ecount_list_bom");

      // Accounting tools
      expect(toolNames).toContain("ecount_save_account_slip");
      expect(toolNames).toContain("ecount_list_bank_accounts");

      // Other tools
      expect(toolNames).toContain("ecount_save_outsourcing");
      expect(toolNames).toContain("ecount_list_lot_tracking");
    });

    it("should start gracefully without config (no tools registered)", async () => {
      delete process.env.ECOUNT_COM_CODE;
      delete process.env.ECOUNT_USER_ID;
      delete process.env.ECOUNT_API_CERT_KEY;
      delete process.env.ECOUNT_ZONE;
      delete process.env.ECOUNT_LAN_TYPE;

      // Reset module cache to re-evaluate config
      vi.resetModules();
      const { createServer } = await import("../../src/server.js");

      // Should NOT throw - graceful degradation
      const server = createServer();
      expect(server).toBeInstanceOf(McpServer);
    });

    it("should have unique tool names (no duplicates)", async () => {
      const server = new McpServer({ name: "dup-test", version: "0.1" });
      const toolNames: string[] = [];
      vi.spyOn(server, "tool").mockImplementation((...args: unknown[]) => {
        toolNames.push(args[0] as string);
        return undefined as unknown as ReturnType<typeof server.tool>;
      });

      const { registerAllTools } = await import("../../src/tools/index.js");
      const { EcountClient } = await import(
        "../../src/client/ecount-client.js"
      );
      const client = new EcountClient({
        ECOUNT_COM_CODE: "TESTCO",
        ECOUNT_USER_ID: "testuser",
        ECOUNT_API_CERT_KEY: "testkey123",
        ECOUNT_ZONE: "AU1",
        ECOUNT_LAN_TYPE: "ko-KR",
      });

      registerAllTools(server, client);

      const uniqueNames = new Set(toolNames);
      expect(uniqueNames.size).toBe(toolNames.length);
    });

    it("should prefix all tools with 'ecount_'", async () => {
      const server = new McpServer({ name: "prefix-test", version: "0.1" });
      const toolNames: string[] = [];
      vi.spyOn(server, "tool").mockImplementation((...args: unknown[]) => {
        toolNames.push(args[0] as string);
        return undefined as unknown as ReturnType<typeof server.tool>;
      });

      const { registerAllTools } = await import("../../src/tools/index.js");
      const { EcountClient } = await import(
        "../../src/client/ecount-client.js"
      );
      const client = new EcountClient({
        ECOUNT_COM_CODE: "TESTCO",
        ECOUNT_USER_ID: "testuser",
        ECOUNT_API_CERT_KEY: "testkey123",
        ECOUNT_ZONE: "AU1",
        ECOUNT_LAN_TYPE: "ko-KR",
      });

      registerAllTools(server, client);

      for (const name of toolNames) {
        expect(name).toMatch(/^ecount_/);
      }
    });
  });

  describe("Tool category counts", () => {
    it("should register correct number of tools per category", async () => {
      const { EcountClient } = await import(
        "../../src/client/ecount-client.js"
      );
      const client = new EcountClient({
        ECOUNT_COM_CODE: "TESTCO",
        ECOUNT_USER_ID: "testuser",
        ECOUNT_API_CERT_KEY: "testkey123",
        ECOUNT_ZONE: "AU1",
        ECOUNT_LAN_TYPE: "ko-KR",
      });

      const categories = [
        {
          name: "connection",
          count: 2,
          import: () => import("../../src/tools/connection.js"),
          fn: "registerConnectionTools",
        },
        {
          name: "master-data",
          count: 11,
          import: () => import("../../src/tools/master-data.js"),
          fn: "registerMasterDataTools",
        },
        {
          name: "sales",
          count: 12,
          import: () => import("../../src/tools/sales.js"),
          fn: "registerSalesTools",
        },
        {
          name: "purchase",
          count: 7,
          import: () => import("../../src/tools/purchase.js"),
          fn: "registerPurchaseTools",
        },
        {
          name: "inventory",
          count: 8,
          import: () => import("../../src/tools/inventory.js"),
          fn: "registerInventoryTools",
        },
        {
          name: "production",
          count: 6,
          import: () => import("../../src/tools/production.js"),
          fn: "registerProductionTools",
        },
        {
          name: "accounting",
          count: 10,
          import: () => import("../../src/tools/accounting.js"),
          fn: "registerAccountingTools",
        },
        {
          name: "other",
          count: 3,
          import: () => import("../../src/tools/other.js"),
          fn: "registerOtherTools",
        },
      ];

      for (const cat of categories) {
        const server = new McpServer({
          name: `${cat.name}-test`,
          version: "0.1",
        });
        const toolSpy = vi.spyOn(server, "tool");

        const mod = await cat.import();
        const registerFn = (mod as Record<string, CallableFunction>)[cat.fn];
        registerFn(server, client);

        expect(toolSpy).toHaveBeenCalledTimes(cat.count);
        toolSpy.mockRestore();
      }
    });
  });
});
