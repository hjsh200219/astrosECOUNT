import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { logger } from "../utils/logger.js";
import { loadMafraConfig } from "../config.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface MeatTraceRecord {
  DISTB_IDNTFC_NO: string;   // 유통식별번호
  PRDLST_NM: string;         // 품목명
  BL_NO: string;             // 선하증권번호
  ORGPLCE_NATION: string;    // 원산지국가
  EXCOURY_SLAU_START_DE: string; // 도축시작일
  EXCOURY_SLAU_END_DE: string;   // 도축종료일
  EXCOURY_SLAU_HSE_NM: string;   // 도축장명
  EXCOURY_PRCSS_START_DE: string; // 가공시작일
  EXCOURY_PRCSS_END_DE: string;   // 가공종료일
  EXCOURY_PRCSS_HSE_NM: string;   // 가공장명
  EXPORT_BSSH_NM: string;    // 수출업체명
  IMPORT_BSSH_NM: string;    // 수입업체명
  IMPORT_DE: string;          // 수입일자
  PRDLST_CD: string;          // 품목코드
  SLE_AT: string;             // 판매여부
}

export interface MeatTraceSearchParams {
  importDate: string;         // YYYYMMDD (필수)
  productCode?: string;       // 품목코드
  blNo?: string;              // 선하증권번호
  originCountry?: string;     // 원산지국가
  saleStatus?: string;        // 판매여부 (Y/N)
  startIndex?: number;        // 시작 인덱스 (default: 1)
  endIndex?: number;          // 종료 인덱스 (default: 100)
}

export interface MeatTraceResponse {
  totalCount: number;
  records: MeatTraceRecord[];
  error?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const MAFRA_BASE_URL = "http://211.237.50.150:7080/openapi";
const GRID_ID = "Grid_20141226000000000174_1";

const RECORD_FIELDS: (keyof MeatTraceRecord)[] = [
  "DISTB_IDNTFC_NO",
  "PRDLST_NM",
  "BL_NO",
  "ORGPLCE_NATION",
  "EXCOURY_SLAU_START_DE",
  "EXCOURY_SLAU_END_DE",
  "EXCOURY_SLAU_HSE_NM",
  "EXCOURY_PRCSS_START_DE",
  "EXCOURY_PRCSS_END_DE",
  "EXCOURY_PRCSS_HSE_NM",
  "EXPORT_BSSH_NM",
  "IMPORT_BSSH_NM",
  "IMPORT_DE",
  "PRDLST_CD",
  "SLE_AT",
];

// ── XML Parser (lightweight, no dependency) ──────────────────────────────────

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const match = re.exec(xml);
  return match ? match[1].trim() : "";
}

function extractAllTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    results.push(match[1]);
  }
  return results;
}

function parseRecord(rowXml: string): MeatTraceRecord {
  const record = {} as MeatTraceRecord;
  for (const field of RECORD_FIELDS) {
    record[field] = extractTag(rowXml, field);
  }
  return record;
}

// ── Core fetch function (exported for tests) ─────────────────────────────────

export async function fetchImportMeatTrace(
  apiKey: string,
  params: MeatTraceSearchParams,
): Promise<MeatTraceResponse> {
  const startIdx = params.startIndex ?? 1;
  const endIdx = params.endIndex ?? 100;

  const queryParams = new URLSearchParams();
  queryParams.set("IMPORT_DE", params.importDate);
  if (params.productCode) queryParams.set("PRDLST_CD", params.productCode);
  if (params.blNo) queryParams.set("BL_NO", params.blNo);
  if (params.originCountry) queryParams.set("ORGPLCE_NATION", params.originCountry);
  if (params.saleStatus) queryParams.set("SLE_AT", params.saleStatus);

  const url = `${MAFRA_BASE_URL}/${apiKey}/xml/${GRID_ID}/${startIdx}/${endIdx}?${queryParams.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  } catch (error) {
    logger.error("수입축산물 이력 API 연결 실패", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error("수입축산물 이력 API 연결 실패: 네트워크 연결 오류");
  }

  if (!response.ok) {
    throw new Error(`수입축산물 이력 API HTTP 오류: ${response.status}`);
  }

  const xml = await response.text();

  // Check for API error
  const resultCode = extractTag(xml, "code");
  if (resultCode && resultCode !== "INFO-000") {
    const resultMessage = extractTag(xml, "message");
    return {
      totalCount: 0,
      records: [],
      error: `${resultCode}: ${resultMessage}`,
    };
  }

  const totalCount = parseInt(extractTag(xml, "totalCnt"), 10) || 0;
  const rows = extractAllTags(xml, "row");
  const records = rows.map(parseRecord);

  return { totalCount, records };
}

// ── Tool Registration ────────────────────────────────────────────────────────

export function registerImportMeatTraceTools(server: McpServer): void {
  server.tool(
    "ecount_search_import_meat",
    "수입축산물(쇠고기/돼지고기) 이력정보를 조회합니다. 수입일자 기준으로 유통식별번호, 원산지, 도축장, 가공장, BL번호 등을 검색합니다. (공공데이터 농림축산검역본부 API)",
    {
      import_date: z.string().regex(/^\d{8}$/, "수입일자는 YYYYMMDD 형식이어야 합니다 (예: 20260110)").describe("수입일자 (YYYYMMDD, 필수)"),
      product_code: z.string().optional().describe("품목코드 (예: 2110111211)"),
      bl_no: z.string().optional().describe("선하증권번호"),
      origin_country: z.string().optional().describe("원산지국가 (예: 호주, 미국)"),
      sale_status: z.enum(["Y", "N"]).optional().describe("판매여부"),
      page: z.number().int().positive().optional().default(1).describe("페이지 번호 (기본: 1)"),
      per_page: z.number().int().positive().max(1000).optional().default(100).describe("페이지당 건수 (기본: 100, 최대: 1000)"),
    },
    { readOnlyHint: true },
    async (params) => {
      try {
        const config = loadMafraConfig();
        if (!config) {
          throw new Error("MAFRA_API_KEY 환경 변수가 설정되지 않았습니다. 공공데이터포털(data.mafra.go.kr)에서 API 키를 발급받아 설정해주세요.");
        }

        const startIndex = (params.page - 1) * params.per_page + 1;
        const endIndex = startIndex + params.per_page - 1;

        const result = await fetchImportMeatTrace(config.MAFRA_API_KEY, {
          importDate: params.import_date,
          productCode: params.product_code,
          blNo: params.bl_no,
          originCountry: params.origin_country,
          saleStatus: params.sale_status,
          startIndex,
          endIndex,
        });

        if (result.error) {
          return formatResponse({
            success: false,
            error: result.error,
            totalCount: 0,
            records: [],
          });
        }

        return formatResponse({
          success: true,
          totalCount: result.totalCount,
          page: params.page,
          perPage: params.per_page,
          recordCount: result.records.length,
          records: result.records,
        });
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.tool(
    "ecount_lookup_meat_by_bl",
    "선하증권(BL) 번호로 수입축산물 이력을 조회합니다. 특정 BL에 포함된 모든 수입축산물의 원산지, 도축장, 가공장 정보를 반환합니다.",
    {
      bl_no: z.string().describe("선하증권번호 (BL No.)"),
      import_date: z.string().regex(/^\d{8}$/, "수입일자는 YYYYMMDD 형식이어야 합니다 (예: 20260110)").describe("수입일자 (YYYYMMDD)"),
    },
    { readOnlyHint: true },
    async (params) => {
      try {
        const config = loadMafraConfig();
        if (!config) {
          throw new Error("MAFRA_API_KEY 환경 변수가 설정되지 않았습니다.");
        }

        const result = await fetchImportMeatTrace(config.MAFRA_API_KEY, {
          importDate: params.import_date,
          blNo: params.bl_no,
        });

        if (result.error) {
          return formatResponse({
            success: false,
            error: result.error,
            records: [],
          });
        }

        return formatResponse({
          success: true,
          blNo: params.bl_no,
          totalCount: result.totalCount,
          records: result.records,
        });
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
