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
    it("should create server and register all 81 tools with valid config", async () => {
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

      registerAllTools(server2, client, {
        ECOUNT_COM_CODE: "TESTCO",
        ECOUNT_USER_ID: "testuser",
        ECOUNT_API_CERT_KEY: "testkey123",
        ECOUNT_ZONE: "AU1",
        ECOUNT_LAN_TYPE: "ko-KR",
        ECOUNT_API_MODE: "production",
      });

      // 3 connection + 4 master-data + 3 sales + 2 purchase
      // + 4 inventory + 3 production + 1 accounting + 2 other + 1 board
      // + 1 bl-parser + 2 contacts + 3 business-rules + 1 pdf-stamp
      // + 3 email-templates + 5 exchange-rate + 6 shipment-tracking
      // + 1 logistics-kpi + 4 contracts + 4 internal-api
      // + 2 inventory-verify + 3 stale-shipments + 1 csv-export + 2 daily-report
      // + 1 health-check + 1 data-integrity + 1 document-status
      // + 2 adjust-inventory + 2 customs-cost = 68
      // + 3 receivables + 3 payables + 1 weight-settlement
      // + 2 inventory-lifecycle + 3 financial-statements + 1 margin-analysis = 81
      expect(toolSpy).toHaveBeenCalledTimes(81);
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
      expect(toolNames).toContain("ecount_zone");
      expect(toolNames).toContain("ecount_login");
      expect(toolNames).toContain("ecount_status");

      // Master-data tools
      expect(toolNames).toContain("ecount_save_customer");
      expect(toolNames).toContain("ecount_save_product");

      // Sales tools
      expect(toolNames).toContain("ecount_save_sale");
      expect(toolNames).toContain("ecount_save_quotation");

      // Purchase tools
      expect(toolNames).toContain("ecount_save_purchase");
      expect(toolNames).toContain("ecount_list_purchase_orders");

      // Inventory tools
      expect(toolNames).toContain("ecount_list_inventory_balance");
      expect(toolNames).toContain("ecount_view_inventory_balance");

      // Production tools
      expect(toolNames).toContain("ecount_save_job_order");
      expect(toolNames).toContain("ecount_save_goods_issued");

      // Accounting tools
      expect(toolNames).toContain("ecount_save_invoice_auto");

      // Other tools
      expect(toolNames).toContain("ecount_save_open_market_order");
      expect(toolNames).toContain("ecount_save_clock_in_out");

      // Board tools
      expect(toolNames).toContain("ecount_create_board");

      // BL Parser tools
      expect(toolNames).toContain("ecount_parse_bl");

      // Contact tools
      expect(toolNames).toContain("ecount_lookup_contact");
      expect(toolNames).toContain("ecount_list_contacts");

      // Business rule tools
      expect(toolNames).toContain("ecount_get_customs_broker");
      expect(toolNames).toContain("ecount_get_warehouse_mapping");
      expect(toolNames).toContain("ecount_list_business_rules");

      // PDF stamp tools
      expect(toolNames).toContain("ecount_stamp_pdf");

      // Email template tools
      expect(toolNames).toContain("ecount_list_email_templates");
      expect(toolNames).toContain("ecount_get_email_template");
      expect(toolNames).toContain("ecount_render_email");

      // Exchange rate tools
      expect(toolNames).toContain("ecount_get_exchange_rate");
      expect(toolNames).toContain("ecount_set_exchange_rate");
      expect(toolNames).toContain("ecount_convert_currency");

      // Shipment tracking tools
      expect(toolNames).toContain("ecount_add_shipment");
      expect(toolNames).toContain("ecount_list_shipments");
      expect(toolNames).toContain("ecount_update_shipment_status");

      // Logistics KPI tools
      expect(toolNames).toContain("ecount_calc_logistics_kpi");

      // Contract tools
      expect(toolNames).toContain("ecount_add_contract");
      expect(toolNames).toContain("ecount_list_contracts");

      // Internal API tools
      expect(toolNames).toContain("ecount_list_sales_internal");
      expect(toolNames).toContain("ecount_list_purchases_internal");
      expect(toolNames).toContain("ecount_list_vatslips");
      expect(toolNames).toContain("ecount_list_account_slips");

      // Inventory verify tools
      expect(toolNames).toContain("ecount_verify_inventory");

      // Stale shipment tools
      expect(toolNames).toContain("ecount_stale_shipments");

      // CSV export tools
      expect(toolNames).toContain("ecount_export_csv");

      // Daily report tools
      expect(toolNames).toContain("ecount_daily_report");
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
          count: 3,
          import: () => import("../../src/tools/connection.js"),
          fn: "registerConnectionTools",
        },
        {
          name: "master-data",
          count: 4,
          import: () => import("../../src/tools/master-data.js"),
          fn: "registerMasterDataTools",
        },
        {
          name: "sales",
          count: 3,
          import: () => import("../../src/tools/sales.js"),
          fn: "registerSalesTools",
        },
        {
          name: "purchase",
          count: 2,
          import: () => import("../../src/tools/purchase.js"),
          fn: "registerPurchaseTools",
        },
        {
          name: "inventory",
          count: 4,
          import: () => import("../../src/tools/inventory.js"),
          fn: "registerInventoryTools",
        },
        {
          name: "production",
          count: 3,
          import: () => import("../../src/tools/production.js"),
          fn: "registerProductionTools",
        },
        {
          name: "accounting",
          count: 1,
          import: () => import("../../src/tools/accounting.js"),
          fn: "registerAccountingTools",
        },
        {
          name: "other",
          count: 2,
          import: () => import("../../src/tools/other.js"),
          fn: "registerOtherTools",
        },
        {
          name: "board",
          count: 1,
          import: () => import("../../src/tools/board.js"),
          fn: "registerBoardTools",
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
