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
    it("should create server and register all 80 default tools with valid config", async () => {
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

      // Default payload: extras (pdf-stamp, diagram, map, presentation, three-d) NOT registered
      // Set ECOUNT_ENABLE_EXTRAS="" (default) — 80 tools
      registerAllTools(server2, client, {
        ECOUNT_COM_CODE: "TESTCO",
        ECOUNT_USER_ID: "testuser",
        ECOUNT_API_CERT_KEY: "testkey123",
        ECOUNT_ZONE: "AU1",
        ECOUNT_LAN_TYPE: "ko-KR",
        ECOUNT_API_MODE: "production",
        ECOUNT_ENABLE_EXTRAS: "",
      });

      // 3 connection + 4 master-data + 3 sales + 2 purchase
      // + 4 inventory + 3 production + 1 accounting + 2 other + 1 board
      // + 1 bl-parser + 2 contacts + 3 business-rules
      // + 3 email-templates + 6 shipment-tracking
      // + 1 logistics-kpi + 4 contracts + 4 internal-api
      // + 2 inventory-verify + 3 stale-shipments + 1 csv-export + 2 daily-report
      // + 1 health-check + 1 data-integrity + 1 document-status
      // + 2 adjust-inventory + 2 customs-cost = 64
      // + 3 receivables + 3 payables + 1 weight-settlement
      // + 2 inventory-lifecycle + 3 financial-statements + 1 margin-analysis = 75
      // + 1 dashboard + 1 pdf-export + 3 fax = 80
      // (pdf-stamp=1 + diagram=1 + map=1 + presentation=1 + three-d=1 = 5 extras, opt-in only)
      expect(toolSpy).toHaveBeenCalledTimes(80);
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
      expect(toolNames).toContain("ecount_connection_zone");
      expect(toolNames).toContain("ecount_connection_login");
      expect(toolNames).toContain("ecount_connection_status");

      // Master-data tools
      expect(toolNames).toContain("ecount_master_save_customer");
      expect(toolNames).toContain("ecount_master_save_product");

      // Sales tools
      expect(toolNames).toContain("ecount_sales_save_sale");
      expect(toolNames).toContain("ecount_sales_save_quotation");

      // Purchase tools
      expect(toolNames).toContain("ecount_purchase_save_purchase");
      expect(toolNames).toContain("ecount_purchase_list_purchase_orders");

      // Inventory tools
      expect(toolNames).toContain("ecount_inventory_list_inventory_balance");
      expect(toolNames).toContain("ecount_inventory_view_inventory_balance");

      // Production tools
      expect(toolNames).toContain("ecount_production_save_job_order");
      expect(toolNames).toContain("ecount_production_save_goods_issued");

      // Accounting tools
      expect(toolNames).toContain("ecount_accounting_save_invoice_auto");

      // Other tools
      expect(toolNames).toContain("ecount_other_save_open_market_order");
      expect(toolNames).toContain("ecount_other_save_clock_in_out");

      // Board tools
      expect(toolNames).toContain("ecount_board_create_board");

      // BL Parser tools
      expect(toolNames).toContain("ecount_bl_parse_bl");

      // Contact tools
      expect(toolNames).toContain("ecount_contact_lookup_contact");
      expect(toolNames).toContain("ecount_contact_list_contacts");

      // Business rule tools
      expect(toolNames).toContain("ecount_rule_get_customs_broker");
      expect(toolNames).toContain("ecount_rule_get_warehouse_mapping");
      expect(toolNames).toContain("ecount_rule_list_business_rules");

      // Email template tools
      expect(toolNames).toContain("ecount_email_list_email_templates");
      expect(toolNames).toContain("ecount_email_get_email_template");
      expect(toolNames).toContain("ecount_email_render_email");

      // Shipment tracking tools
      expect(toolNames).toContain("ecount_shipment_add_shipment");
      expect(toolNames).toContain("ecount_shipment_list_shipments");
      expect(toolNames).toContain("ecount_shipment_update_shipment_status");

      // Logistics KPI tools
      expect(toolNames).toContain("ecount_logistics_calc_logistics_kpi");

      // Contract tools
      expect(toolNames).toContain("ecount_contract_add_contract");
      expect(toolNames).toContain("ecount_contract_list_contracts");

      // Internal API tools
      expect(toolNames).toContain("ecount_internal_list_sales_internal");
      expect(toolNames).toContain("ecount_internal_list_purchases_internal");
      expect(toolNames).toContain("ecount_internal_list_vatslips");
      expect(toolNames).toContain("ecount_internal_list_account_slips");

      // Inventory verify tools
      expect(toolNames).toContain("ecount_inventory_verify_inventory");

      // Stale shipment tools
      expect(toolNames).toContain("ecount_shipment_stale_shipments");

      // CSV export tools
      expect(toolNames).toContain("ecount_csv_export_csv");

      // Daily report tools
      expect(toolNames).toContain("ecount_report_daily_report");

      // Dashboard tools (v6 output layer)
      expect(toolNames).toContain("ecount_dashboard_render_dashboard");

      // PDF export tools (v6 output layer)
      expect(toolNames).toContain("ecount_pdf_export_pdf");

      // Fax tools (v6 output layer)
      expect(toolNames).toContain("ecount_fax_send_fax");
      expect(toolNames).toContain("ecount_fax_get_fax_status");
      expect(toolNames).toContain("ecount_fax_list_fax_history");

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
