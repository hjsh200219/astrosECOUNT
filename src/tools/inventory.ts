import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import { registerTools, type ToolDefinition } from "./tool-factory.js";

const inventoryTools: ToolDefinition[] = [
  {
    name: "ecount_inventory_view_inventory_balance",
    description:
      "ECOUNT ERP 특정 품목의 재고 잔량을 조회합니다. 품목코드와 기준일자를 지정하여 해당 시점의 재고 현황을 확인할 때 사용합니다.",
    endpoint: "InventoryBalance/ViewInventoryBalanceStatus",
    type: "query",
    inputSchema: {
      PROD_CD: z.string().describe("품목코드"),
      BASE_DATE: z.string().describe("기준일자 (YYYYMMDD)"),
      WH_CD: z.string().optional().describe("창고코드"),
      ZERO_FLAG: z.string().optional().describe("재고 0인 품목 포함 여부 (Y/N)"),
      BAL_FLAG: z.string().optional().describe("재고관리 품목만 조회 여부 (Y/N)"),
      DEL_GUBUN: z.string().optional().describe("삭제 품목 포함 여부 (Y/N)"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_inventory_list_inventory_balance",
    description:
      "ECOUNT ERP 재고 잔량 목록을 조회합니다. 기준일자 기준으로 전체 또는 특정 품목의 재고 현황을 확인할 때 사용합니다.",
    endpoint: "InventoryBalance/GetListInventoryBalanceStatus",
    type: "query",
    inputSchema: {
      BASE_DATE: z.string().describe("기준일자 (YYYYMMDD)"),
      PROD_CD: z.string().optional().describe("품목코드"),
      WH_CD: z.string().optional().describe("창고코드"),
      ZERO_FLAG: z.string().optional().describe("재고 0인 품목 포함 여부 (Y/N)"),
      BAL_FLAG: z.string().optional().describe("재고관리 품목만 조회 여부 (Y/N)"),
      DEL_GUBUN: z.string().optional().describe("삭제 품목 포함 여부 (Y/N)"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_inventory_view_inventory_by_location",
    description:
      "ECOUNT ERP 특정 품목의 로케이션별 재고 잔량을 조회합니다. 창고 내 로케이션 단위로 재고 위치와 수량을 확인할 때 사용합니다.",
    endpoint: "InventoryBalance/ViewInventoryBalanceStatusByLocation",
    type: "query",
    inputSchema: {
      PROD_CD: z.string().describe("품목코드"),
      BASE_DATE: z.string().describe("기준일자 (YYYYMMDD)"),
      WH_CD: z.string().optional().describe("창고코드"),
      ZERO_FLAG: z.string().optional().describe("재고 0인 품목 포함 여부 (Y/N)"),
      BAL_FLAG: z.string().optional().describe("재고관리 품목만 조회 여부 (Y/N)"),
      DEL_GUBUN: z.string().optional().describe("삭제 품목 포함 여부 (Y/N)"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_inventory_list_inventory_by_location",
    description:
      "ECOUNT ERP 로케이션별 재고 잔량 목록을 조회합니다. 기준일자 기준으로 창고 내 로케이션별 재고 현황을 확인할 때 사용합니다.",
    endpoint: "InventoryBalance/GetListInventoryBalanceStatusByLocation",
    type: "query",
    inputSchema: {
      BASE_DATE: z.string().describe("기준일자 (YYYYMMDD)"),
      PROD_CD: z.string().optional().describe("품목코드"),
      WH_CD: z.string().optional().describe("창고코드"),
      ZERO_FLAG: z.string().optional().describe("재고 0인 품목 포함 여부 (Y/N)"),
      BAL_FLAG: z.string().optional().describe("재고관리 품목만 조회 여부 (Y/N)"),
      DEL_GUBUN: z.string().optional().describe("삭제 품목 포함 여부 (Y/N)"),
    },
    annotations: { readOnlyHint: true },
  },
];

export function registerInventoryTools(server: McpServer, client: EcountClient): void {
  registerTools(server, client, inventoryTools);
}
