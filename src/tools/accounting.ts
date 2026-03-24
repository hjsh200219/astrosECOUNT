import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import { registerTools, type ToolDefinition } from "./tool-factory.js";

const accountingTools: ToolDefinition[] = [
  {
    name: "ecount_save_invoice_auto",
    description:
      "ECOUNT ERP 자동 세금계산서(청구서)를 저장합니다. 매출 또는 매입 거래에 대한 전표를 자동으로 생성하고 등록할 때 사용합니다.",
    endpoint: "InvoiceAuto/SaveInvoiceAuto",
    type: "save",
    listKey: "InvoiceAutoList",
    inputSchema: {
      SL_DATE: z.string().describe("전표일자 (YYYYMMDD)"),
      CUST: z.string().describe("거래처코드"),
      SUPPLY_AMT: z.string().describe("공급가액"),
      SLIP_TYPE: z.string().optional().describe("전표구분 (1: 매출, 2: 매입)"),
      VAT_AMT: z.string().optional().describe("부가세액"),
      REMARKS: z.string().optional().describe("비고"),
      CUST_DES: z.string().optional().describe("거래처명"),
      EMP_CD: z.string().optional().describe("담당자코드"),
      PJT_CD: z.string().optional().describe("프로젝트코드"),
      UPLOAD_SER_NO: z.string().optional().describe("순번"),
      ITEM_CD: z.string().optional().describe("관리항목코드"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
];

export function registerAccountingTools(server: McpServer, client: EcountClient): void {
  registerTools(server, client, accountingTools);
}
