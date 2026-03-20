import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import { registerTools, type ToolDefinition } from "./tool-factory.js";

const purchaseTools: ToolDefinition[] = [
  {
    name: "ecount_save_purchase",
    description: "ECOUNT ERP 매입전표를 저장합니다. 매입 거래를 등록하거나 수정할 때 사용합니다.",
    endpoint: "PurchaseSlip/SavePurchase",
    inputSchema: {
      PU_DATE: z.string().describe("매입일자 (YYYYMMDD)"),
      CUST_CD: z.string().describe("거래처 코드"),
      PROD_CD: z.string().describe("품목 코드"),
      QTY: z.number().describe("수량"),
      PRICE: z.number().optional().describe("단가"),
      SUPPLY_AMT: z.number().optional().describe("공급가액"),
      VAT_AMT: z.number().optional().describe("부가세액"),
      WH_CD: z.string().optional().describe("창고 코드"),
      REM: z.string().optional().describe("비고"),
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "ecount_list_purchase_slips",
    description: "ECOUNT ERP 매입전표 목록을 조회합니다. 특정 기간의 매입 내역을 확인할 때 사용합니다.",
    endpoint: "PurchaseSlip/ListPurchaseSlip",
    inputSchema: {
      BASE_DATE_FROM: z.string().describe("조회 시작일 (YYYYMMDD)"),
      BASE_DATE_TO: z.string().describe("조회 종료일 (YYYYMMDD)"),
      CUST_CD: z.string().optional().describe("거래처 코드"),
      PROD_CD: z.string().optional().describe("품목 코드"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_view_purchase_slip",
    description: "ECOUNT ERP 매입전표 상세를 조회합니다. 특정 전표번호로 매입전표의 전체 정보를 확인할 때 사용합니다.",
    endpoint: "PurchaseSlip/ViewPurchaseSlip",
    inputSchema: {
      PU_NO: z.string().describe("매입전표 번호"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_bulk_purchase_slips",
    description: "ECOUNT ERP 매입전표를 일괄 조회합니다. 대량의 매입전표를 한번에 조회할 때 사용합니다.",
    endpoint: "PurchaseSlip/BulkPurchaseSlip",
    inputSchema: {
      BASE_DATE_FROM: z.string().describe("조회 시작일 (YYYYMMDD)"),
      BASE_DATE_TO: z.string().describe("조회 종료일 (YYYYMMDD)"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(100).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_save_purchase_order",
    description: "ECOUNT ERP 발주를 저장합니다. 발주(구매 주문)를 등록하거나 수정할 때 사용합니다.",
    endpoint: "PurchaseOrder/SavePurchaseOrder",
    inputSchema: {
      PO_DATE: z.string().describe("발주일자 (YYYYMMDD)"),
      CUST_CD: z.string().describe("거래처 코드"),
      PROD_CD: z.string().describe("품목 코드"),
      QTY: z.number().describe("수량"),
      PRICE: z.number().optional().describe("단가"),
      DELIVERY_DATE: z.string().optional().describe("납기일 (YYYYMMDD)"),
      REM: z.string().optional().describe("비고"),
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "ecount_list_purchase_orders",
    description: "ECOUNT ERP 발주 목록을 조회합니다. 특정 기간의 발주 내역을 확인할 때 사용합니다.",
    endpoint: "PurchaseOrder/ListPurchaseOrder",
    inputSchema: {
      BASE_DATE_FROM: z.string().describe("조회 시작일 (YYYYMMDD)"),
      BASE_DATE_TO: z.string().describe("조회 종료일 (YYYYMMDD)"),
      CUST_CD: z.string().optional().describe("거래처 코드"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_view_purchase_order",
    description: "ECOUNT ERP 발주 상세를 조회합니다. 특정 발주번호로 발주 전체 정보를 확인할 때 사용합니다.",
    endpoint: "PurchaseOrder/ViewPurchaseOrder",
    inputSchema: {
      PO_NO: z.string().describe("발주 번호"),
    },
    annotations: { readOnlyHint: true },
  },
];

export function registerPurchaseTools(server: McpServer, client: EcountClient): void {
  registerTools(server, client, purchaseTools);
}
