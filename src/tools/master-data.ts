import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import { registerTools, type ToolDefinition } from "./tool-factory.js";

const masterDataTools: ToolDefinition[] = [
  {
    name: "ecount_save_product",
    description:
      "ECOUNT ERP에 품목을 등록하거나 수정합니다. 새 품목을 추가하거나 기존 품목 정보를 변경할 때 사용합니다.",
    endpoint: "Product/SaveProduct",
    inputSchema: {
      PROD_CD: z.string().describe("품목 코드"),
      PROD_DES: z.string().describe("품목명"),
      PROD_TYPE: z.string().optional().describe("품목 유형 (상품/제품/반제품/원재료)"),
      UNIT: z.string().optional().describe("단위"),
      IN_PRICE: z.number().optional().describe("입고단가"),
      OUT_PRICE: z.number().optional().describe("출고단가"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "ecount_list_products",
    description:
      "ECOUNT ERP 품목 목록을 조회합니다. 전체 품목 목록이나 특정 조건의 품목을 검색할 때 사용합니다.",
    endpoint: "Product/ListProduct",
    inputSchema: {
      PROD_CD: z.string().optional().describe("품목 코드 (필터)"),
      PROD_DES: z.string().optional().describe("품목명 (필터)"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_view_product",
    description:
      "ECOUNT ERP 특정 품목의 상세 정보를 조회합니다. 품목 코드로 단일 품목의 전체 정보를 확인할 때 사용합니다.",
    endpoint: "Product/ViewProduct",
    inputSchema: {
      PROD_CD: z.string().describe("품목 코드"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_save_customer",
    description:
      "ECOUNT ERP에 거래처를 등록하거나 수정합니다. 새 거래처를 추가하거나 기존 거래처 정보를 변경할 때 사용합니다.",
    endpoint: "Customer/SaveCustomer",
    inputSchema: {
      CUST_CD: z.string().describe("거래처 코드"),
      CUST_DES: z.string().describe("거래처명"),
      BOSS_NM: z.string().optional().describe("대표자명"),
      TEL_NO: z.string().optional().describe("전화번호"),
      EMAIL: z.string().optional().describe("이메일"),
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "ecount_list_customers",
    description:
      "ECOUNT ERP 거래처 목록을 조회합니다. 전체 거래처 목록이나 특정 조건의 거래처를 검색할 때 사용합니다.",
    endpoint: "Customer/ListCustomer",
    inputSchema: {
      CUST_CD: z.string().optional().describe("거래처 코드 (필터)"),
      CUST_DES: z.string().optional().describe("거래처명 (필터)"),
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_view_customer",
    description:
      "ECOUNT ERP 특정 거래처의 상세 정보를 조회합니다. 거래처 코드로 단일 거래처의 전체 정보를 확인할 때 사용합니다.",
    endpoint: "Customer/ViewCustomer",
    inputSchema: {
      CUST_CD: z.string().describe("거래처 코드"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_list_warehouses",
    description:
      "ECOUNT ERP 창고 목록을 조회합니다. 사용 가능한 창고 목록을 확인할 때 사용합니다.",
    endpoint: "Warehouse/ListWarehouse",
    inputSchema: {
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_list_departments",
    description:
      "ECOUNT ERP 부서 목록을 조회합니다. 조직 구조에서 부서 목록을 확인할 때 사용합니다.",
    endpoint: "Department/ListDepartment",
    inputSchema: {
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_list_employees",
    description:
      "ECOUNT ERP 사원 목록을 조회합니다. 담당자 배정이나 사원 정보 확인 시 사용합니다.",
    endpoint: "Employee/ListEmployee",
    inputSchema: {
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_list_accounts",
    description:
      "ECOUNT ERP 계정과목 목록을 조회합니다. 회계 전표 작성 시 사용할 계정과목을 확인할 때 사용합니다.",
    endpoint: "Account/ListAccount",
    inputSchema: {
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "ecount_list_projects",
    description:
      "ECOUNT ERP 프로젝트 목록을 조회합니다. 프로젝트별 비용 관리나 프로젝트 목록 확인 시 사용합니다.",
    endpoint: "Project/ListProject",
    inputSchema: {
      PAGE_NO: z.number().optional().default(1).describe("페이지 번호"),
      PER_PAGE_CNT: z.number().optional().default(20).describe("페이지당 건수"),
    },
    annotations: { readOnlyHint: true },
  },
];

export function registerMasterDataTools(server: McpServer, client: EcountClient): void {
  registerTools(server, client, masterDataTools);
}
