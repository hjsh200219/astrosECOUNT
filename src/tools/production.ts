import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import { registerTools, type ToolDefinition } from "./tool-factory.js";

const productionTools: ToolDefinition[] = [
  {
    name: "ecount_save_production_order",
    description: "ECOUNT ERP 생산지시를 저장합니다. 생산 계획에 따라 생산지시를 등록하거나 수정할 때 사용합니다.",
    endpoint: "ProductionOrder/SaveProductionOrder",
    inputSchema: {
      PD_DATE: z.string().describe("생산지시일 (YYYYMMDD)"),
      PROD_CD: z.string().describe("생산 품목 코드"),
      QTY: z.number().describe("생산 수량"),
      WH_CD: z.string().optional().describe("창고 코드"),
      DUE_DATE: z.string().optional().describe("완료 예정일 (YYYYMMDD)"),
      REM: z.string().optional().describe("비고"),
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "ecount_list_production_orders",
    description: "ECOUNT ERP 생산지시 목록을 조회합니다. 특정 기간의 생산지시 내역을 확인할 때 사용합니다.",
    endpoint: "ProductionOrder/ListProductionOrder",
    inputSchema: {
      BASE_DATE_FROM: z.string().describe("조회 시작일 (YYYYMMDD)"),
      BASE_DATE_TO: z.string().describe("조회 종료일 (YYYYMMDD)"),
      PROD_CD: z.string().optional().describe("품목 코드"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_save_production_result",
    description: "ECOUNT ERP 생산실적을 저장합니다. 생산 완료 후 실적을 등록할 때 사용합니다.",
    endpoint: "ProductionResult/SaveProductionResult",
    inputSchema: {
      PR_DATE: z.string().describe("생산실적일 (YYYYMMDD)"),
      PROD_CD: z.string().describe("생산 품목 코드"),
      QTY: z.number().describe("생산 수량"),
      WH_CD: z.string().optional().describe("입고 창고 코드"),
      REM: z.string().optional().describe("비고"),
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "ecount_list_production_results",
    description: "ECOUNT ERP 생산실적 목록을 조회합니다. 특정 기간의 생산 완료 내역을 확인할 때 사용합니다.",
    endpoint: "ProductionResult/ListProductionResult",
    inputSchema: {
      BASE_DATE_FROM: z.string().describe("조회 시작일 (YYYYMMDD)"),
      BASE_DATE_TO: z.string().describe("조회 종료일 (YYYYMMDD)"),
      PROD_CD: z.string().optional().describe("품목 코드"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_list_bom",
    description: "ECOUNT ERP BOM(자재명세서)을 조회합니다. 제품의 구성 자재와 소요량을 확인할 때 사용합니다.",
    endpoint: "BOM/ListBOM",
    inputSchema: {
      PROD_CD: z.string().describe("완제품 품목 코드"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_save_bom",
    description: "ECOUNT ERP BOM(자재명세서)을 저장합니다. 제품의 구성 자재와 소요량을 등록하거나 수정할 때 사용합니다.",
    endpoint: "BOM/SaveBOM",
    inputSchema: {
      PROD_CD: z.string().describe("완제품 품목 코드"),
      MATERIAL_CD: z.string().describe("자재 품목 코드"),
      QTY: z.number().describe("소요량"),
      LOSS_RATE: z.number().optional().describe("로스율 (%)"),
    },
    annotations: { readOnlyHint: false },
  },
];

export function registerProductionTools(server: McpServer, client: EcountClient): void {
  registerTools(server, client, productionTools);
}
