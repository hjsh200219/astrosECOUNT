import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import { registerTools, type ToolDefinition } from "./tool-factory.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

const purchaseTools: ToolDefinition[] = [
  {
    name: "ecount_save_purchase",
    description:
      "ECOUNT ERP 구매(매입) 전표를 저장합니다. 실제 구매 거래를 등록하거나 수정할 때 사용합니다.",
    endpoint: "Purchases/SavePurchases",
    type: "save",
    listKey: "PurchaseList",
    inputSchema: {
      PROD_CD: z.string().describe("품목코드"),
      QTY: z.string().describe("수량"),
      WH_CD: z.string().describe("입고창고코드"),
      UPLOAD_SER_NO: z.string().optional().describe("전표번호 (수정 시 사용)"),
      IO_DATE: z.string().optional().describe("구매일자 (YYYYMMDD)"),
      CUST: z.string().optional().describe("거래처코드"),
      CUST_DES: z.string().optional().describe("거래처명"),
      EMP_CD: z.string().optional().describe("담당사원코드"),
      PRICE: z.string().optional().describe("단가"),
      SUPPLY_AMT: z.string().optional().describe("공급가액"),
      VAT_AMT: z.string().optional().describe("부가세액"),
      REMARKS: z.string().optional().describe("비고"),
      IO_TYPE: z.string().optional().describe("구분(거래유형) 부가세유형코드"),
      EXCHANGE_TYPE: z.string().optional().describe("외화종류 코드"),
      EXCHANGE_RATE: z.string().optional().describe("환율"),
      PJT_CD: z.string().optional().describe("프로젝트코드"),
      PROD_DES: z.string().optional().describe("품목명"),
      SIZE_DES: z.string().optional().describe("규격"),
      UQTY: z.string().optional().describe("추가수량"),
      USER_PRICE_VAT: z.string().optional().describe("단가(VAT포함)"),
      SUPPLY_AMT_F: z.string().optional().describe("공급가액(외화)"),
      ITEM_CD: z.string().optional().describe("관리항목코드"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
];

export function registerPurchaseTools(server: McpServer, client: EcountClient): void {
  registerTools(server, client, purchaseTools);

  // Custom handler for purchase order list - uses special ListParam body structure
  server.tool(
    "ecount_list_purchase_orders",
    "ECOUNT ERP 발주 목록을 조회합니다. 특정 기간의 발주(구매 주문) 내역을 확인할 때 사용합니다.",
    {
      BASE_DATE_FROM: z.string().describe("조회 시작일 (YYYYMMDD)"),
      BASE_DATE_TO: z.string().describe("조회 종료일 (YYYYMMDD)"),
      PROD_CD: z.string().optional().describe("품목코드"),
      CUST_CD: z.string().optional().describe("거래처코드"),
      EMP_CD: z.string().optional().describe("담당자코드"),
      WH_CD: z.string().optional().describe("창고코드"),
      PAGE_CURRENT: z.number().optional().default(1).describe("현재 페이지 번호"),
      PAGE_SIZE: z.number().optional().default(26).describe("페이지당 건수"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const body = {
          PROD_CD: params.PROD_CD ?? "",
          CUST_CD: params.CUST_CD ?? "",
          EMP_CD: params.EMP_CD ?? "",
          WH_CD: params.WH_CD ?? "",
          ListParam: {
            BASE_DATE_FROM: params.BASE_DATE_FROM,
            BASE_DATE_TO: params.BASE_DATE_TO,
            PAGE_CURRENT: params.PAGE_CURRENT ?? 1,
            PAGE_SIZE: params.PAGE_SIZE ?? 26,
          },
        };
        const result = await client.post("Purchases/GetPurchasesOrderList", body);
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
