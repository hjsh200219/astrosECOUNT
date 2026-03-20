import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import { registerTools, type ToolDefinition } from "./tool-factory.js";

const salesTools: ToolDefinition[] = [
  {
    name: "ecount_save_sale",
    description: "ECOUNT ERP 매출전표를 저장합니다. 매출 거래를 등록하거나 수정할 때 사용합니다.",
    endpoint: "SaleSlip/SaveSale",
    inputSchema: {
      SL_DATE: z.string().describe("매출일자 (YYYYMMDD)"),
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
    name: "ecount_list_sale_slips",
    description: "ECOUNT ERP 매출전표 목록을 조회합니다. 특정 기간의 매출 내역을 확인할 때 사용합니다.",
    endpoint: "SaleSlip/ListSaleSlip",
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
    name: "ecount_view_sale_slip",
    description: "ECOUNT ERP 매출전표 상세를 조회합니다. 특정 전표번호로 매출전표의 전체 정보를 확인할 때 사용합니다.",
    endpoint: "SaleSlip/ViewSaleSlip",
    inputSchema: {
      SL_NO: z.string().describe("매출전표 번호"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_bulk_sale_slips",
    description: "ECOUNT ERP 매출전표를 일괄 조회합니다. 대량의 매출전표를 한번에 조회할 때 사용합니다.",
    endpoint: "SaleSlip/BulkSaleSlip",
    inputSchema: {
      BASE_DATE_FROM: z.string().describe("조회 시작일 (YYYYMMDD)"),
      BASE_DATE_TO: z.string().describe("조회 종료일 (YYYYMMDD)"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(100).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_save_sale_order",
    description: "ECOUNT ERP 수주를 저장합니다. 수주(판매 주문)를 등록하거나 수정할 때 사용합니다.",
    endpoint: "SaleOrder/SaveSaleOrder",
    inputSchema: {
      SO_DATE: z.string().describe("수주일자 (YYYYMMDD)"),
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
    name: "ecount_list_sale_orders",
    description: "ECOUNT ERP 수주 목록을 조회합니다. 특정 기간의 수주 내역을 확인할 때 사용합니다.",
    endpoint: "SaleOrder/ListSaleOrder",
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
    name: "ecount_view_sale_order",
    description: "ECOUNT ERP 수주 상세를 조회합니다. 특정 수주번호로 수주 전체 정보를 확인할 때 사용합니다.",
    endpoint: "SaleOrder/ViewSaleOrder",
    inputSchema: {
      SO_NO: z.string().describe("수주 번호"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_save_sale_price",
    description: "ECOUNT ERP 판매단가를 저장합니다. 거래처별/품목별 판매단가를 등록하거나 수정할 때 사용합니다.",
    endpoint: "SalePrice/SaveSalePrice",
    inputSchema: {
      CUST_CD: z.string().describe("거래처 코드"),
      PROD_CD: z.string().describe("품목 코드"),
      PRICE: z.number().describe("단가"),
      APPLY_DATE: z.string().optional().describe("적용 시작일 (YYYYMMDD)"),
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "ecount_list_sale_prices",
    description: "ECOUNT ERP 판매단가 목록을 조회합니다. 거래처별 또는 품목별 판매단가를 확인할 때 사용합니다.",
    endpoint: "SalePrice/ListSalePrice",
    inputSchema: {
      CUST_CD: z.string().optional().describe("거래처 코드"),
      PROD_CD: z.string().optional().describe("품목 코드"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_save_quotation",
    description: "ECOUNT ERP 견적서를 저장합니다. 견적서를 등록하거나 수정할 때 사용합니다.",
    endpoint: "Quotation/SaveQuotation",
    inputSchema: {
      QT_DATE: z.string().describe("견적일자 (YYYYMMDD)"),
      CUST_CD: z.string().describe("거래처 코드"),
      PROD_CD: z.string().describe("품목 코드"),
      QTY: z.number().describe("수량"),
      PRICE: z.number().optional().describe("단가"),
      VALID_DATE: z.string().optional().describe("유효기간 (YYYYMMDD)"),
      REM: z.string().optional().describe("비고"),
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "ecount_list_quotations",
    description: "ECOUNT ERP 견적서 목록을 조회합니다. 특정 기간의 견적서 내역을 확인할 때 사용합니다.",
    endpoint: "Quotation/ListQuotation",
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
    name: "ecount_view_quotation",
    description: "ECOUNT ERP 견적서 상세를 조회합니다. 특정 견적번호로 견적서 전체 정보를 확인할 때 사용합니다.",
    endpoint: "Quotation/ViewQuotation",
    inputSchema: {
      QT_NO: z.string().describe("견적서 번호"),
    },
    annotations: { readOnlyHint: true },
  },
];

export function registerSalesTools(server: McpServer, client: EcountClient): void {
  registerTools(server, client, salesTools);
}
