import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import { registerTools, type ToolDefinition } from "./tool-factory.js";

const otherTools: ToolDefinition[] = [
  {
    name: "ecount_save_outsourcing",
    description: "ECOUNT ERP 외주 내역을 저장합니다. 외주 가공을 등록하거나 수정할 때 사용합니다.",
    endpoint: "Outsourcing/SaveOutsourcing",
    inputSchema: {
      OS_DATE: z.string().describe("외주일자 (YYYYMMDD)"),
      CUST_CD: z.string().describe("외주 거래처 코드"),
      PROD_CD: z.string().describe("품목 코드"),
      QTY: z.number().describe("수량"),
      PRICE: z.number().optional().describe("단가"),
      REM: z.string().optional().describe("비고"),
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "ecount_list_outsourcing",
    description: "ECOUNT ERP 외주 목록을 조회합니다. 특정 기간의 외주 내역을 확인할 때 사용합니다.",
    endpoint: "Outsourcing/ListOutsourcing",
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
    name: "ecount_list_lot_tracking",
    description: "ECOUNT ERP LOT 추적 정보를 조회합니다. 품목의 LOT 단위 이력을 추적할 때 사용합니다.",
    endpoint: "LotTracking/ListLotTracking",
    inputSchema: {
      PROD_CD: z.string().describe("품목 코드"),
      LOT_NO: z.string().optional().describe("LOT 번호"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
];

export function registerOtherTools(server: McpServer, client: EcountClient): void {
  registerTools(server, client, otherTools);
}
