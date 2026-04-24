import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import { registerTools, type ToolDefinition } from "./tool-factory.js";

const productionTools: ToolDefinition[] = [
  {
    name: "ecount_production_save_job_order",
    description:
      "ECOUNT ERP 작업지시를 저장합니다. 생산을 위한 작업지시를 등록하거나 수정할 때 사용합니다.",
    endpoint: "JobOrder/SaveJobOrder",
    type: "save",
    listKey: "JobOrderList",
    inputSchema: {
      PROD_CD: z.string().describe("품목코드"),
      QTY: z.string().describe("지시수량"),
      UPLOAD_SER_NO: z.string().optional().describe("전표번호 (수정 시 사용)"),
      IO_DATE: z.string().optional().describe("작업지시일자 (YYYYMMDD)"),
      WH_CD: z.string().optional().describe("창고코드"),
      REMARKS: z.string().optional(),
      CUST: z.string().optional().describe("거래처코드"),
      EMP_CD: z.string().optional().describe("담당자코드"),
      PROD_DES: z.string().optional().describe("품목명"),
      SIZE_DES: z.string().optional().describe("규격"),
      PJT_CD: z.string().optional().describe("프로젝트코드"),
      ITEM_CD: z.string().optional().describe("관리항목코드"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "ecount_production_save_goods_issued",
    description:
      "ECOUNT ERP 생산 자재 출고(불출)를 저장합니다. 생산에 사용할 자재를 창고에서 출고 처리할 때 사용합니다.",
    endpoint: "GoodsIssued/SaveGoodsIssued",
    type: "save",
    listKey: "GoodsIssuedList",
    inputSchema: {
      PROD_CD: z.string().describe("품목코드"),
      QTY: z.string().describe("출고수량"),
      UPLOAD_SER_NO: z.string().optional().describe("전표번호 (수정 시 사용)"),
      IO_DATE: z.string().optional().describe("출고일자 (YYYYMMDD)"),
      WH_CD: z.string().optional().describe("창고코드"),
      REMARKS: z.string().optional(),
      CUST: z.string().optional().describe("거래처코드"),
      EMP_CD: z.string().optional().describe("담당자코드"),
      PROD_DES: z.string().optional().describe("품목명"),
      SIZE_DES: z.string().optional().describe("규격"),
      PJT_CD: z.string().optional().describe("프로젝트코드"),
      ITEM_CD: z.string().optional().describe("관리항목코드"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "ecount_production_save_goods_receipt",
    description:
      "ECOUNT ERP 생산 완료 입고를 저장합니다. 생산이 완료된 제품을 창고에 입고 처리할 때 사용합니다.",
    endpoint: "GoodsReceipt/SaveGoodsReceipt",
    type: "save",
    listKey: "GoodsReceiptList",
    inputSchema: {
      PROD_CD: z.string().describe("품목코드"),
      QTY: z.string().describe("입고수량"),
      UPLOAD_SER_NO: z.string().optional().describe("전표번호 (수정 시 사용)"),
      IO_DATE: z.string().optional().describe("입고일자 (YYYYMMDD)"),
      WH_CD: z.string().optional().describe("창고코드"),
      REMARKS: z.string().optional(),
      CUST: z.string().optional().describe("거래처코드"),
      EMP_CD: z.string().optional().describe("담당자코드"),
      PROD_DES: z.string().optional().describe("품목명"),
      SIZE_DES: z.string().optional().describe("규격"),
      PJT_CD: z.string().optional().describe("프로젝트코드"),
      ITEM_CD: z.string().optional().describe("관리항목코드"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
];

export function registerProductionTools(server: McpServer, client: EcountClient): void {
  registerTools(server, client, productionTools);
}
