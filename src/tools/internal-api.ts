import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import type { InternalApiClient } from "../client/internal-api-client.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { logger } from "../utils/logger.js";

export const INTERNAL_ENDPOINTS = {
  SALES: "/Account/GetSaleSlipStatusList",
  PURCHASES: "/Account/GetPurchaseSlipStatusList",
  VAT_SLIPS: "/Account/GetInvoiceAutoList",
  ACCOUNT_SLIPS: "/Account/GetAccountSlipList",
} as const;

interface InternalPoster {
  post<T>(path: string, params: Record<string, unknown>): Promise<T>;
}

class LegacyPosterAdapter implements InternalPoster {
  constructor(private client: EcountClient) {}
  async post<T>(path: string, params: Record<string, unknown>): Promise<T> {
    return this.client.postRaw<T>(path, params);
  }
}

interface InternalToolDef {
  name: string;
  description: string;
  endpoint: string;
  extraParams: Record<string, z.ZodTypeAny>;
  mapParams: (params: Record<string, unknown>) => Record<string, unknown>;
}

const TOOL_DEFS: InternalToolDef[] = [
  {
    name: "ecount_list_sales_internal",
    description: "ECOUNT 내부 API를 통해 판매(매출) 전표 목록을 조회합니다. Open API로 접근 불가능한 상세 판매 데이터(622건+)를 조회할 때 사용합니다.",
    endpoint: INTERNAL_ENDPOINTS.SALES,
    extraParams: {
      cust_cd: z.string().optional().describe("거래처코드"),
      prod_cd: z.string().optional().describe("품목코드"),
    },
    mapParams: (p) => ({ CUST_CD: p.cust_cd ?? "", PROD_CD: p.prod_cd ?? "" }),
  },
  {
    name: "ecount_list_purchases_internal",
    description: "ECOUNT 내부 API를 통해 구매(매입) 전표 목록을 조회합니다. Open API로 접근 불가능한 상세 구매 데이터를 조회할 때 사용합니다.",
    endpoint: INTERNAL_ENDPOINTS.PURCHASES,
    extraParams: {
      cust_cd: z.string().optional().describe("거래처코드"),
      prod_cd: z.string().optional().describe("품목코드"),
    },
    mapParams: (p) => ({ CUST_CD: p.cust_cd ?? "", PROD_CD: p.prod_cd ?? "" }),
  },
  {
    name: "ecount_list_vatslips",
    description: "ECOUNT 내부 API를 통해 부가세 전표(세금계산서) 목록을 조회합니다. 매출/매입 세금계산서 발행 현황을 확인할 때 사용합니다.",
    endpoint: INTERNAL_ENDPOINTS.VAT_SLIPS,
    extraParams: {
      slip_type: z.string().optional().describe("전표 유형 (\"1\"=매출, \"2\"=매입)"),
      cust_cd: z.string().optional().describe("거래처코드"),
    },
    mapParams: (p) => ({ SLIP_TYPE: p.slip_type ?? "", CUST_CD: p.cust_cd ?? "" }),
  },
  {
    name: "ecount_list_account_slips",
    description: "ECOUNT 내부 API를 통해 계정별 전표 목록을 조회합니다. 특정 계정과목의 전표 내역을 확인할 때 사용합니다.",
    endpoint: INTERNAL_ENDPOINTS.ACCOUNT_SLIPS,
    extraParams: {
      account_cd: z.string().optional().describe("계정과목코드"),
      slip_type: z.string().optional().describe("전표 유형"),
    },
    mapParams: (p) => ({ ACCOUNT_CD: p.account_cd ?? "", SLIP_TYPE: p.slip_type ?? "" }),
  },
];

const BASE_SCHEMA = {
  from_date: z.string().describe("조회 시작일 (YYYYMMDD)"),
  to_date: z.string().describe("조회 종료일 (YYYYMMDD)"),
  page: z.number().default(1).describe("페이지 번호"),
  per_page: z.number().default(20).describe("페이지당 건수"),
};

export function registerInternalApiTools(
  server: McpServer,
  client: EcountClient,
  internalClient?: InternalApiClient,
): void {
  const poster: InternalPoster = internalClient ?? new LegacyPosterAdapter(client);
  const mode = internalClient ? "KeyPack" : "Legacy(postRaw)";
  logger.info("내부 API 도구 등록", { mode });

  for (const def of TOOL_DEFS) {
    server.tool(
      def.name, def.description,
      { ...BASE_SCHEMA, ...def.extraParams },
      { readOnlyHint: true },
      async (params: Record<string, unknown>) => {
        try {
          const result = await poster.post(def.endpoint, {
            FROM_DATE: params.from_date,
            TO_DATE: params.to_date,
            PAGE: params.page,
            PER_PAGE: params.per_page,
            ...def.mapParams(params),
          });
          return formatResponse(result);
        } catch (error) {
          return handleToolError(error);
        }
      },
    );
  }
}
