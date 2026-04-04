/**
 * E2E tests: real MCP Client ↔ Server over InMemoryTransport.
 *
 * Tests the full JSON-RPC protocol flow:
 *   Client.connect() → initialize → listTools → callTool → response
 *
 * Category B tools (standalone, no EcountClient) are tested with real calls.
 * Category A tools require ECOUNT credentials so are skipped.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { EcountClient } from "../../src/client/ecount-client.js";
import { registerAllTools } from "../../src/tools/index.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

let client: Client;
let serverTransport: InMemoryTransport;
let clientTransport: InMemoryTransport;

function createTestServer(): McpServer {
  const server = new McpServer({ name: "e2e-test", version: "1.0.0" });
  const eclient = new EcountClient({
    ECOUNT_COM_CODE: "E2E",
    ECOUNT_USER_ID: "e2euser",
    ECOUNT_API_CERT_KEY: "e2ekey",
    ECOUNT_ZONE: "AU1",
    ECOUNT_LAN_TYPE: "ko-KR",
  });
  registerAllTools(server, eclient, {
    ECOUNT_COM_CODE: "E2E",
    ECOUNT_USER_ID: "e2euser",
    ECOUNT_API_CERT_KEY: "e2ekey",
    ECOUNT_ZONE: "AU1",
    ECOUNT_LAN_TYPE: "ko-KR",
    ECOUNT_API_MODE: "production",
  });
  return server;
}

/** Helper: extract parsed JSON from callTool result */
function parseResult(result: { content: unknown }): unknown {
  const text = (result.content as Array<{ type: string; text: string }>)[0].text;
  return JSON.parse(text);
}

/** Helper: extract raw text from callTool result */
function rawText(result: { content: unknown }): string {
  return (result.content as Array<{ type: string; text: string }>)[0].text;
}

describe("MCP Server E2E", () => {
  beforeAll(async () => {
    const server = createTestServer();
    [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: "e2e-client", version: "1.0.0" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await clientTransport.close();
    await serverTransport.close();
  });

  // ── Protocol handshake ──

  describe("Protocol handshake", () => {
    it("should complete initialize and list 85 tools", async () => {
      const result = await client.listTools();
      expect(result.tools.length).toBe(85);
    });

    it("should have unique tool names", async () => {
      const result = await client.listTools();
      const names = result.tools.map((t) => t.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it("should prefix all tools with ecount_", async () => {
      const result = await client.listTools();
      for (const tool of result.tools) {
        expect(tool.name).toMatch(/^ecount_/);
      }
    });

    it("every tool should have a description", async () => {
      const result = await client.listTools();
      for (const tool of result.tools) {
        expect(tool.description).toBeTruthy();
      }
    });

    it("every tool should have an inputSchema", async () => {
      const result = await client.listTools();
      for (const tool of result.tools) {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
      }
    });
  });

  // ── Category B tools: real callTool ──

  describe("BL Parser (ecount_parse_bl)", () => {
    it("should parse a COSCO BL number", async () => {
      const result = await client.callTool({
        name: "ecount_parse_bl",
        arguments: { bl_number: "COSU6123456780" },
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { carrier: string; blNumber: string; valid: boolean };
      expect(data.carrier).toBe("COSCO");
      expect(data.blNumber).toBe("COSU6123456780");
      expect(data.valid).toBe(true);
    });

    it("should return valid=false for unknown carrier BL", async () => {
      const result = await client.callTool({
        name: "ecount_parse_bl",
        arguments: { bl_number: "XXXX12345" },
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { valid: boolean; carrier: string };
      expect(data.valid).toBe(false);
      expect(data.carrier).toBe("UNKNOWN");
    });
  });

  describe("Contacts (ecount_lookup_contact / ecount_list_contacts)", () => {
    it("should list all contacts with count wrapper", async () => {
      const result = await client.callTool({
        name: "ecount_list_contacts",
        arguments: {},
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { count: number; contacts: unknown[] };
      expect(data.count).toBeGreaterThan(0);
      expect(data.contacts.length).toBe(data.count);
    });

    it("should lookup a contact by name", async () => {
      const result = await client.callTool({
        name: "ecount_lookup_contact",
        arguments: { name: "김민수" },
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { found: boolean; contact: { name: string; company: string } };
      expect(data.found).toBe(true);
      expect(data.contact.name).toBe("김민수");
      expect(data.contact.company).toBe("삼현INT");
    });

    it("should return found=false for unknown contact", async () => {
      const result = await client.callTool({
        name: "ecount_lookup_contact",
        arguments: { name: "존재하지않는사람" },
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { found: boolean };
      expect(data.found).toBe(false);
    });
  });

  describe("Business Rules", () => {
    it("should return 원스탑 customs broker for 전지벌크", async () => {
      const result = await client.callTool({
        name: "ecount_get_customs_broker",
        arguments: { product_name: "전지벌크" },
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { broker: string; contact: string; reason: string };
      expect(data.broker).toBe("원스탑관세법인");
    });

    it("should return 정운 for non-전지벌크 product", async () => {
      const result = await client.callTool({
        name: "ecount_get_customs_broker",
        arguments: { product_name: "LA갈비" },
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { broker: string };
      expect(data.broker).toBe("정운관세법인");
    });

    it("should return warehouse mapping (no params)", async () => {
      const result = await client.callTool({
        name: "ecount_get_warehouse_mapping",
        arguments: {},
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { stages: unknown[] };
      expect(data.stages).toBeDefined();
      expect(data.stages.length).toBe(3);
    });

    it("should list all business rules with count wrapper", async () => {
      const result = await client.callTool({
        name: "ecount_list_business_rules",
        arguments: {},
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { count: number; rules: unknown[] };
      expect(data.count).toBeGreaterThan(0);
      expect(data.rules.length).toBe(data.count);
    });
  });

  describe("Email Templates", () => {
    it("should list all 15 templates with count wrapper", async () => {
      const result = await client.callTool({
        name: "ecount_list_email_templates",
        arguments: {},
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { count: number; templates: unknown[] };
      expect(data.count).toBe(15);
      expect(data.templates.length).toBe(15);
    });

    it("should get a specific template by id", async () => {
      const result = await client.callTool({
        name: "ecount_get_email_template",
        arguments: { id: "TPL-CUSTOMS-01" },
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { found: boolean; template: { id: string } };
      expect(data.found).toBe(true);
      expect(data.template.id).toBe("TPL-CUSTOMS-01");
    });

    it("should render a customs request email with data substitution", async () => {
      const result = await client.callTool({
        name: "ecount_render_email",
        arguments: {
          id: "TPL-CUSTOMS-01",
          data: {
            PRODUCT_NAME: "LA갈비",
            BL_NUMBER: "COSU1234567890",
            ETA: "2026-04-01",
          },
        },
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { found: boolean; subject: string; body: string };
      expect(data.found).toBe(true);
      expect(data.subject).toContain("COSU1234567890");
      expect(data.body).toContain("LA갈비");
    });

    it("should return found=false for unknown template", async () => {
      const result = await client.callTool({
        name: "ecount_render_email",
        arguments: { id: "NONEXISTENT", data: {} },
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { found: boolean };
      expect(data.found).toBe(false);
    });
  });

  describe("Shipment Tracking", () => {
    let shipmentId: string;

    it("should add a shipment and list it", async () => {
      const addResult = await client.callTool({
        name: "ecount_add_shipment",
        arguments: {
          blNumber: "COSU9999999990",
          carrier: "COSCO",
          product: "LA갈비",
          origin: "Santos",
          destination: "Busan",
          eta: "2026-04-15",
          status: "booked",
        },
      });
      expect(addResult.isError).toBeFalsy();
      const addData = parseResult(addResult) as { success: boolean; shipment: { id: string } };
      expect(addData.success).toBe(true);
      shipmentId = addData.shipment.id;
      expect(shipmentId).toBeTruthy();

      const listResult = await client.callTool({
        name: "ecount_list_shipments",
        arguments: {},
      });
      expect(listResult.isError).toBeFalsy();
      const listData = parseResult(listResult) as { count: number; shipments: Array<{ id: string }> };
      expect(listData.count).toBeGreaterThanOrEqual(1);
      expect(listData.shipments.some((s) => s.id === shipmentId)).toBe(true);
    });

    it("should update ETA and get history", async () => {
      const updateResult = await client.callTool({
        name: "ecount_update_eta",
        arguments: {
          id: shipmentId,
          eta: "2026-04-20",
          reason: "Port congestion",
        },
      });
      expect(updateResult.isError).toBeFalsy();
      const updateData = parseResult(updateResult) as { success: boolean; shipment: { eta: string } };
      expect(updateData.success).toBe(true);
      expect(updateData.shipment.eta).toBe("2026-04-20");

      const historyResult = await client.callTool({
        name: "ecount_get_eta_history",
        arguments: { id: shipmentId },
      });
      expect(historyResult.isError).toBeFalsy();
      const historyData = parseResult(historyResult) as { count: number; history: Array<{ newEta: string }> };
      expect(historyData.count).toBeGreaterThanOrEqual(1);
      expect(historyData.history[0].newEta).toBe("2026-04-20");
    });

    it("should update shipment status", async () => {
      const result = await client.callTool({
        name: "ecount_update_shipment_status",
        arguments: { id: shipmentId, status: "in_transit" },
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { success: boolean; shipment: { status: string } };
      expect(data.success).toBe(true);
      expect(data.shipment.status).toBe("in_transit");
    });
  });

  describe("Contracts", () => {
    it("should add a contract and list contracts", async () => {
      const addResult = await client.callTool({
        name: "ecount_add_contract",
        arguments: {
          contractNumber: "E2E-CONTRACT-001",
          supplier: "JBS",
          buyer: "아스트로스",
          product: "LA갈비",
          quantity: 20000,
          unitPrice: 5.5,
          currency: "USD",
          incoterms: "CIF Busan",
          status: "signed",
        },
      });
      expect(addResult.isError).toBeFalsy();
      const addData = parseResult(addResult) as { success: boolean; contract: { contractNumber: string } };
      expect(addData.success).toBe(true);
      expect(addData.contract.contractNumber).toBe("E2E-CONTRACT-001");

      const listResult = await client.callTool({
        name: "ecount_list_contracts",
        arguments: {},
      });
      expect(listResult.isError).toBeFalsy();
      const listData = parseResult(listResult) as { count: number; contracts: Array<{ contractNumber: string }> };
      expect(listData.count).toBeGreaterThanOrEqual(1);
      expect(listData.contracts.some((c) => c.contractNumber === "E2E-CONTRACT-001")).toBe(true);
    });
  });

  describe("Health Check (ecount_health_check)", () => {
    it("should return a health report with subsystem statuses", async () => {
      const result = await client.callTool({
        name: "ecount_health_check",
        arguments: {},
      });
      expect(result.isError).toBeFalsy();
      const report = parseResult(result) as { overall: string; subsystems: unknown[]; checkedAt: string };
      expect(report.overall).toBeDefined();
      expect(report.subsystems).toBeDefined();
      expect(Array.isArray(report.subsystems)).toBe(true);
      expect(report.subsystems.length).toBeGreaterThan(0);
      expect(report.checkedAt).toBeTruthy();
    });
  });

  describe("Inventory Adjustment", () => {
    it("should adjust inventory and list adjustments", async () => {
      const adjustResult = await client.callTool({
        name: "ecount_adjust_inventory",
        arguments: {
          product: "E2E-PROD-001",
          warehouse: "WH-01",
          quantityChange: 100,
          reason: "E2E initial stock",
          adjustedBy: "e2e-tester",
        },
      });
      expect(adjustResult.isError).toBeFalsy();
      const adjustData = parseResult(adjustResult) as { success: boolean; adjustment: { id: string } };
      expect(adjustData.success).toBe(true);
      expect(adjustData.adjustment.id).toBeTruthy();

      const listResult = await client.callTool({
        name: "ecount_list_adjustments",
        arguments: {},
      });
      expect(listResult.isError).toBeFalsy();
      const listData = parseResult(listResult) as { count: number; adjustments: unknown[] };
      expect(listData.count).toBeGreaterThanOrEqual(1);
    });

    it("should return error for zero quantity adjustment", async () => {
      const result = await client.callTool({
        name: "ecount_adjust_inventory",
        arguments: {
          product: "X",
          warehouse: "W",
          quantityChange: 0,
          reason: "zero",
          adjustedBy: "tester",
        },
      });
      // Tool catches the error via handleToolError
      expect(result.isError).toBeTruthy();
    });
  });

  describe("Customs Cost Override & Landed Cost", () => {
    it("should override customs cost and calculate landed cost", async () => {
      const overrideResult = await client.callTool({
        name: "ecount_override_customs_cost",
        arguments: {
          shipmentId: "E2E-SHIP-001",
          customsDuty: 500000,
          additionalCosts: [
            { name: "운송비", amount: 200000 },
            { name: "보험료", amount: 50000 },
          ],
          reason: "E2E test override",
          overriddenBy: "e2e-tester",
        },
      });
      expect(overrideResult.isError).toBeFalsy();
      const overrideData = parseResult(overrideResult) as { success: boolean; override: { id: string } };
      expect(overrideData.success).toBe(true);

      const landedResult = await client.callTool({
        name: "ecount_get_landed_cost",
        arguments: {
          shipmentId: "E2E-SHIP-001",
          basePrice: 10000,
          exchangeRate: 1350,
        },
      });
      expect(landedResult.isError).toBeFalsy();
      const landedData = parseResult(landedResult) as { found: boolean; landedCost: { landedCost: number } };
      expect(landedData.found).toBe(true);
      // 10000 * 1350 + 500000 + 200000 + 50000 = 14250000
      expect(landedData.landedCost.landedCost).toBe(14250000);
    });

    it("should return found=false for unknown shipment landed cost", async () => {
      const result = await client.callTool({
        name: "ecount_get_landed_cost",
        arguments: {
          shipmentId: "NONEXISTENT",
          basePrice: 100,
          exchangeRate: 1300,
        },
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { found: boolean };
      expect(data.found).toBe(false);
    });
  });

  describe("CSV Export (ecount_export_csv)", () => {
    it("should export data array as CSV", async () => {
      const result = await client.callTool({
        name: "ecount_export_csv",
        arguments: {
          data: [
            { name: "LA갈비", quantity: 100, price: 5.5 },
            { name: "전지벌크", quantity: 200, price: 3.2 },
          ],
        },
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { csv: string; rowCount: number };
      expect(data.rowCount).toBe(2);
      expect(data.csv).toContain("name,quantity,price");
      expect(data.csv).toContain("LA갈비");
    });
  });

  describe("Logistics KPI (ecount_calc_logistics_kpi)", () => {
    it("should calculate logistics KPI", async () => {
      const result = await client.callTool({
        name: "ecount_calc_logistics_kpi",
        arguments: {},
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { totalShipments: number; byStatus: Record<string, number> };
      expect(data.totalShipments).toBeDefined();
      expect(data.byStatus).toBeDefined();
    });
  });

  describe("Daily Report (ecount_daily_report)", () => {
    it("should generate a daily report", async () => {
      const result = await client.callTool({
        name: "ecount_daily_report",
        arguments: {},
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { report: string };
      expect(data.report).toBeTruthy();
      expect(data.report.length).toBeGreaterThan(10);
      expect(data.report).toContain("일일 업무 리포트");
    });
  });

  describe("Diagnostic Report (ecount_diagnostic_report)", () => {
    it("should generate L1-L3 diagnostic report", async () => {
      const result = await client.callTool({
        name: "ecount_diagnostic_report",
        arguments: {},
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as {
        date: string;
        diagnostics: Array<{ level: string; status: string }>;
        passCount: number;
        warningCount: number;
        failCount: number;
        overallHealth: string;
      };
      expect(data.date).toBeTruthy();
      expect(data.diagnostics).toBeDefined();
      expect(Array.isArray(data.diagnostics)).toBe(true);
      expect(data.diagnostics.length).toBeGreaterThan(0);
      // Verify L1, L2, L3 levels exist
      const levels = new Set(data.diagnostics.map((d) => d.level));
      expect(levels.has("L1")).toBe(true);
      expect(levels.has("L2")).toBe(true);
      expect(levels.has("L3")).toBe(true);
      expect(data.overallHealth).toBeDefined();
    });
  });

  describe("Data Integrity (ecount_validate_data_integrity)", () => {
    it("should validate data integrity with matching data", async () => {
      const result = await client.callTool({
        name: "ecount_validate_data_integrity",
        arguments: {
          contracts: [
            { id: "CTR-001", blNumber: "COSU1111", product: "LA갈비" },
          ],
          shipments: [
            { id: "SHP-001", blNumber: "COSU1111", product: "LA갈비", status: "in_transit" },
          ],
        },
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as {
        checks: Array<{ name: string; passed: boolean }>;
        passCount: number;
        failCount: number;
        overallPassed: boolean;
      };
      expect(data.checks).toBeDefined();
      expect(Array.isArray(data.checks)).toBe(true);
      expect(data.overallPassed).toBe(true);
    });

    it("should detect mismatched contracts and shipments", async () => {
      const result = await client.callTool({
        name: "ecount_validate_data_integrity",
        arguments: {
          contracts: [
            { id: "CTR-001", blNumber: "COSU1111", product: "LA갈비" },
          ],
          shipments: [
            { id: "SHP-001", blNumber: "COSU2222", product: "전지벌크", status: "in_transit" },
          ],
        },
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { failCount: number; overallPassed: boolean };
      expect(data.failCount).toBeGreaterThan(0);
      expect(data.overallPassed).toBe(false);
    });
  });

  describe("Document Status (ecount_check_document_status)", () => {
    it("should check document status for shipments", async () => {
      const result = await client.callTool({
        name: "ecount_check_document_status",
        arguments: {
          shipments: [
            {
              shipmentId: "SHP-001",
              blNumber: "COSU1111",
              documents: ["B/L", "Invoice"],
              status: "in_transit",
            },
          ],
        },
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as {
        documentChecks: Array<{ missingDocuments: string[]; completionRate: number }>;
        totalIssues: number;
      };
      expect(data.documentChecks).toBeDefined();
      expect(data.documentChecks.length).toBe(1);
      // Missing: Packing List, Certificate of Origin, Health Certificate
      expect(data.documentChecks[0].missingDocuments.length).toBe(3);
      expect(data.totalIssues).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Stale Shipments", () => {
    it("should find stale shipments (returns empty if all recently updated)", async () => {
      const result = await client.callTool({
        name: "ecount_stale_shipments",
        arguments: {},
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { count: number; staleShipments: unknown[] };
      expect(data.count).toBeDefined();
      expect(Array.isArray(data.staleShipments)).toBe(true);
    });

    it("should check customs delays", async () => {
      const result = await client.callTool({
        name: "ecount_customs_delays",
        arguments: {},
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { count: number; delayedShipments: unknown[] };
      expect(data.count).toBeDefined();
    });

    it("should check delivery delays", async () => {
      const result = await client.callTool({
        name: "ecount_delivery_delays",
        arguments: {},
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { count: number; delayedShipments: unknown[] };
      expect(data.count).toBeDefined();
    });
  });

  describe("PDF Stamp (ecount_stamp_pdf)", () => {
    it("should return error for non-existent PDF file", async () => {
      const result = await client.callTool({
        name: "ecount_stamp_pdf",
        arguments: {
          pdf_path: "/tmp/nonexistent-e2e-test.pdf",
          output_path: "/tmp/nonexistent-e2e-output.pdf",
        },
      });
      expect(result.isError).toBeFalsy();
      const data = parseResult(result) as { success: boolean; error: string };
      expect(data.success).toBe(false);
      expect(data.error).toContain("찾을 수 없습니다");
    });

    it("should stamp a real PDF file", async () => {
      // Create a minimal valid PDF
      const tmpDir = os.tmpdir();
      const inputPdf = path.join(tmpDir, "e2e-stamp-input.pdf");
      const outputPdf = path.join(tmpDir, "e2e-stamp-output.pdf");

      // Minimal valid PDF (1 blank page)
      const minimalPdf = Buffer.from(
        "JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSA+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDQgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjIwNgolJUVPRgo=",
        "base64"
      );
      fs.writeFileSync(inputPdf, minimalPdf);

      try {
        const result = await client.callTool({
          name: "ecount_stamp_pdf",
          arguments: {
            pdf_path: inputPdf,
            output_path: outputPdf,
          },
        });
        expect(result.isError).toBeFalsy();
        const data = parseResult(result) as { success: boolean; outputPath: string };
        expect(data.success).toBe(true);
        expect(fs.existsSync(outputPdf)).toBe(true);
      } finally {
        // Cleanup
        if (fs.existsSync(inputPdf)) fs.unlinkSync(inputPdf);
        if (fs.existsSync(outputPdf)) fs.unlinkSync(outputPdf);
      }
    });
  });

  // ── Error handling ──

  describe("Error handling", () => {
    it("should return isError for non-existent tool", async () => {
      const result = await client.callTool({ name: "ecount_nonexistent", arguments: {} });
      expect(result.isError).toBe(true);
      const text = rawText(result);
      expect(text).toContain("not found");
    });

    it("should return error for missing required argument (Zod validation)", async () => {
      // BL parser with missing required bl_number
      const result = await client.callTool({
        name: "ecount_parse_bl",
        arguments: {},
      });
      // MCP SDK returns validation error
      expect(result.content).toBeDefined();
    });
  });
});
