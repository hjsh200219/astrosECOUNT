import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import { registerTools, type ToolDefinition } from "./tool-factory.js";

const inventoryTools: ToolDefinition[] = [
  {
    name: "ecount_list_inventory_by_product",
    description: "ECOUNT ERP 품목별 재고현황을 조회합니다. 특정 품목이나 전체 품목의 현재 재고 수량을 확인할 때 사용합니다.",
    endpoint: "InventoryStatus/ListInventoryStatusByProduct",
    inputSchema: {
      BASE_DATE: z.string().describe("기준일자 (YYYYMMDD)"),
      PROD_CD: z.string().optional().describe("품목 코드"),
      WH_CD: z.string().optional().describe("창고 코드"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_list_inventory_by_warehouse",
    description: "ECOUNT ERP 창고별 재고현황을 조회합니다. 특정 창고나 전체 창고의 재고 수량을 확인할 때 사용합니다.",
    endpoint: "InventoryStatus/ListInventoryStatusByWH",
    inputSchema: {
      BASE_DATE: z.string().describe("기준일자 (YYYYMMDD)"),
      WH_CD: z.string().optional().describe("창고 코드"),
      PROD_CD: z.string().optional().describe("품목 코드"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_save_inventory_move",
    description: "ECOUNT ERP 재고이동을 저장합니다. 창고 간 재고를 이동할 때 사용합니다.",
    endpoint: "InventoryMove/SaveInventoryMove",
    inputSchema: {
      MOVE_DATE: z.string().describe("이동일자 (YYYYMMDD)"),
      FROM_WH_CD: z.string().describe("출고 창고 코드"),
      TO_WH_CD: z.string().describe("입고 창고 코드"),
      PROD_CD: z.string().describe("품목 코드"),
      QTY: z.number().describe("수량"),
      REM: z.string().optional().describe("비고"),
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "ecount_save_inventory_adjust",
    description: "ECOUNT ERP 재고조정을 저장합니다. 실사 후 재고 수량을 조정할 때 사용합니다.",
    endpoint: "InventoryAdjust/SaveInventoryAdjust",
    inputSchema: {
      ADJUST_DATE: z.string().describe("조정일자 (YYYYMMDD)"),
      WH_CD: z.string().describe("창고 코드"),
      PROD_CD: z.string().describe("품목 코드"),
      QTY: z.number().describe("조정 수량"),
      REM: z.string().optional().describe("비고"),
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "ecount_list_inout_by_product",
    description: "ECOUNT ERP 품목별 입출고현황을 조회합니다. 특정 기간의 입고/출고 이력을 확인할 때 사용합니다.",
    endpoint: "InventoryIO/ListInOutStatusByProduct",
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
    name: "ecount_list_inout_by_warehouse",
    description: "ECOUNT ERP 창고별 입출고현황을 조회합니다. 특정 창고의 입고/출고 이력을 확인할 때 사용합니다.",
    endpoint: "InventoryIO/ListInOutStatusByWH",
    inputSchema: {
      BASE_DATE_FROM: z.string().describe("조회 시작일 (YYYYMMDD)"),
      BASE_DATE_TO: z.string().describe("조회 종료일 (YYYYMMDD)"),
      WH_CD: z.string().optional().describe("창고 코드"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_save_barcode_scan",
    description: "ECOUNT ERP 바코드 스캔 데이터를 저장합니다. 바코드 기반 입출고 처리 시 사용합니다.",
    endpoint: "BarcodeScan/SaveBarcodeScan",
    inputSchema: {
      SCAN_DATE: z.string().describe("스캔일자 (YYYYMMDD)"),
      BARCODE: z.string().describe("바코드 값"),
      QTY: z.number().describe("수량"),
      WH_CD: z.string().optional().describe("창고 코드"),
      REM: z.string().optional().describe("비고"),
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "ecount_list_barcode_scans",
    description: "ECOUNT ERP 바코드 스캔 목록을 조회합니다. 바코드 스캔 이력을 확인할 때 사용합니다.",
    endpoint: "BarcodeScan/ListBarcodeScan",
    inputSchema: {
      BASE_DATE_FROM: z.string().describe("조회 시작일 (YYYYMMDD)"),
      BASE_DATE_TO: z.string().describe("조회 종료일 (YYYYMMDD)"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
];

export function registerInventoryTools(server: McpServer, client: EcountClient): void {
  registerTools(server, client, inventoryTools);
}
