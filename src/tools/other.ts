import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import { registerTools, type ToolDefinition } from "./tool-factory.js";

const otherTools: ToolDefinition[] = [
  {
    name: "ecount_save_open_market_order",
    description:
      "ECOUNT ERP 오픈마켓 주문을 저장합니다. 쇼핑몰이나 오픈마켓에서 발생한 주문 데이터를 등록하거나 수정할 때 사용합니다.",
    endpoint: "OpenMarket/SaveOpenMarketOrderNew",
    type: "save",
    listKey: "OpenMarketList",
    inputSchema: {
      PROD_CD: z.string().describe("품목코드"),
      QTY: z.string().describe("수량"),
      IO_DATE: z.string().optional().describe("주문일자 (YYYYMMDD)"),
      CUST: z.string().optional().describe("거래처코드"),
      WH_CD: z.string().optional().describe("창고코드"),
      PRICE: z.string().optional().describe("단가"),
      REMARKS: z.string().optional().describe("비고"),
      CUST_DES: z.string().optional().describe("거래처명"),
      EMP_CD: z.string().optional().describe("담당자코드"),
      PROD_DES: z.string().optional().describe("품목명"),
      SIZE_DES: z.string().optional().describe("규격"),
      UPLOAD_SER_NO: z.string().optional().describe("순번"),
      SUPPLY_AMT: z.string().optional().describe("공급가액"),
      VAT_AMT: z.string().optional().describe("부가세액"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "ecount_save_clock_in_out",
    description:
      "ECOUNT ERP 출퇴근 기록을 저장합니다. 사원의 출근 또는 퇴근 시간을 등록할 때 사용합니다.",
    endpoint: "TimeMgmt/SaveClockInOut",
    type: "save",
    listKey: "ClockInOutList",
    inputSchema: {
      EMP_CD: z.string().describe("사원코드"),
      CLOCK_TYPE: z.string().describe("출퇴근구분 (I: 출근, O: 퇴근)"),
      CLOCK_DATE: z.string().optional().describe("출퇴근일자 (YYYYMMDD)"),
      CLOCK_TIME: z.string().optional().describe("출퇴근시간 (HHmm)"),
      REMARKS: z.string().optional().describe("비고"),
      EMP_DES: z.string().optional().describe("사원명"),
      DEPT_CD: z.string().optional().describe("부서코드"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
];

export function registerOtherTools(server: McpServer, client: EcountClient): void {
  registerTools(server, client, otherTools);
}
