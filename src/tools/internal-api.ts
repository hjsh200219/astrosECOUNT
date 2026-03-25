import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

// Internal API endpoint paths (ECOUNT V5 Web App)
export const INTERNAL_ENDPOINTS = {
  SALES: "/Account/GetSaleSlipStatusList",
  PURCHASES: "/Account/GetPurchaseSlipStatusList",
  VAT_SLIPS: "/Account/GetInvoiceAutoList",
  ACCOUNT_SLIPS: "/Account/GetAccountSlipList",
} as const;

export function registerInternalApiTools(server: McpServer, client: EcountClient): void {
  // B-1: ecount_list_sales_internal
  server.tool(
    "ecount_list_sales_internal",
    "ECOUNT 내부 API를 통해 판매(매출) 전표 목록을 조회합니다. Open API로 접근 불가능한 상세 판매 데이터(622건+)를 조회할 때 사용합니다. ⚠️ KeyPack 프로토콜 구현 후 사용 가능.",
    {
      from_date: z.string().describe("조회 시작일 (YYYYMMDD)"),
      to_date: z.string().describe("조회 종료일 (YYYYMMDD)"),
      cust_cd: z.string().optional().describe("거래처코드"),
      prod_cd: z.string().optional().describe("품목코드"),
      page: z.number().default(1).describe("페이지 번호"),
      per_page: z.number().default(20).describe("페이지당 건수"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = await client.postRaw(INTERNAL_ENDPOINTS.SALES, {
          FROM_DATE: params.from_date,
          TO_DATE: params.to_date,
          CUST_CD: params.cust_cd ?? "",
          PROD_CD: params.prod_cd ?? "",
          PAGE: params.page,
          PER_PAGE: params.per_page,
        });
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // B-2: ecount_list_purchases_internal
  server.tool(
    "ecount_list_purchases_internal",
    "ECOUNT 내부 API를 통해 구매(매입) 전표 목록을 조회합니다. Open API로 접근 불가능한 상세 구매 데이터를 조회할 때 사용합니다. ⚠️ KeyPack 프로토콜 구현 후 사용 가능.",
    {
      from_date: z.string().describe("조회 시작일 (YYYYMMDD)"),
      to_date: z.string().describe("조회 종료일 (YYYYMMDD)"),
      cust_cd: z.string().optional().describe("거래처코드"),
      prod_cd: z.string().optional().describe("품목코드"),
      page: z.number().default(1).describe("페이지 번호"),
      per_page: z.number().default(20).describe("페이지당 건수"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = await client.postRaw(INTERNAL_ENDPOINTS.PURCHASES, {
          FROM_DATE: params.from_date,
          TO_DATE: params.to_date,
          CUST_CD: params.cust_cd ?? "",
          PROD_CD: params.prod_cd ?? "",
          PAGE: params.page,
          PER_PAGE: params.per_page,
        });
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // B-3: ecount_list_vatslips
  server.tool(
    "ecount_list_vatslips",
    "ECOUNT 내부 API를 통해 부가세 전표(세금계산서) 목록을 조회합니다. 매출/매입 세금계산서 발행 현황을 확인할 때 사용합니다. ⚠️ KeyPack 프로토콜 구현 후 사용 가능.",
    {
      from_date: z.string().describe("조회 시작일 (YYYYMMDD)"),
      to_date: z.string().describe("조회 종료일 (YYYYMMDD)"),
      slip_type: z.string().optional().describe("전표 유형 (\"1\"=매출, \"2\"=매입)"),
      cust_cd: z.string().optional().describe("거래처코드"),
      page: z.number().default(1).describe("페이지 번호"),
      per_page: z.number().default(20).describe("페이지당 건수"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = await client.postRaw(INTERNAL_ENDPOINTS.VAT_SLIPS, {
          FROM_DATE: params.from_date,
          TO_DATE: params.to_date,
          SLIP_TYPE: params.slip_type ?? "",
          CUST_CD: params.cust_cd ?? "",
          PAGE: params.page,
          PER_PAGE: params.per_page,
        });
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // B-4: ecount_list_account_slips
  server.tool(
    "ecount_list_account_slips",
    "ECOUNT 내부 API를 통해 계정별 전표 목록을 조회합니다. 특정 계정과목의 전표 내역을 확인할 때 사용합니다. ⚠️ KeyPack 프로토콜 구현 후 사용 가능.",
    {
      from_date: z.string().describe("조회 시작일 (YYYYMMDD)"),
      to_date: z.string().describe("조회 종료일 (YYYYMMDD)"),
      account_cd: z.string().optional().describe("계정과목코드"),
      slip_type: z.string().optional().describe("전표 유형"),
      page: z.number().default(1).describe("페이지 번호"),
      per_page: z.number().default(20).describe("페이지당 건수"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = await client.postRaw(INTERNAL_ENDPOINTS.ACCOUNT_SLIPS, {
          FROM_DATE: params.from_date,
          TO_DATE: params.to_date,
          ACCOUNT_CD: params.account_cd ?? "",
          SLIP_TYPE: params.slip_type ?? "",
          PAGE: params.page,
          PER_PAGE: params.per_page,
        });
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
