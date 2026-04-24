import { z } from "zod";
import { createRequire } from "module";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { loadPopbillConfig } from "../config.js";

// ── Type stubs (mirrors src/types/popbill.d.ts) ─────────────────────────────

interface FaxResult {
  state: number;
  result: number;
  receiveNum: string;
  receiveName: string;
  sendState: number;
  title: string;
}

interface FaxSearchResponse {
  total: number;
  perPage: number;
  pageNum: number;
  pageCount: number;
  list: FaxResult[];
}

interface PopbillError {
  code: number;
  message: string;
}

interface FaxServiceInstance {
  sendFax(
    corpNum: string,
    sender: string,
    receiver: string,
    receiverName: string,
    filePaths: string[],
    reserveDT: string,
    senderName: string,
    adsYN: boolean,
    title: string,
    requestNum: string,
    userID: string,
    success: (receiptNum: string) => void,
    error: (err: PopbillError) => void,
  ): void;
  getFaxResult(
    corpNum: string,
    receiptNum: string,
    success: (results: FaxResult[]) => void,
    error: (err: PopbillError) => void,
  ): void;
  search(
    corpNum: string,
    startDate: string,
    endDate: string,
    state: number[],
    reserveYN: boolean,
    senderOnly: boolean,
    order: string,
    page: number,
    perPage: number,
    qString: string,
    success: (response: FaxSearchResponse) => void,
    error: (err: PopbillError) => void,
  ): void;
}

// ── Promisify helpers (exported for tests) ───────────────────────────────────

export interface SendFaxOpts {
  corpNum: string;
  sender: string;
  receiver: string;
  receiverName: string;
  filePaths: string[];
  title: string;
}

export function promisifySendFax(service: FaxServiceInstance, opts: SendFaxOpts): Promise<string> {
  return new Promise((resolve, reject) => {
    service.sendFax(
      opts.corpNum,
      opts.sender,
      opts.receiver,
      opts.receiverName,
      opts.filePaths,
      "",       // reserveDT — immediate
      "",       // senderName
      false,    // adsYN
      opts.title,
      "",       // requestNum
      "",       // userID
      (receiptNum) => resolve(receiptNum),
      (err) => reject(new Error(err.message)),
    );
  });
}

export function promisifyGetFaxResult(
  service: FaxServiceInstance,
  corpNum: string,
  receiptNum: string,
): Promise<FaxResult[]> {
  return new Promise((resolve, reject) => {
    service.getFaxResult(
      corpNum,
      receiptNum,
      (results) => resolve(results),
      (err) => reject(new Error(err.message)),
    );
  });
}

export interface SearchFaxOpts {
  corpNum: string;
  startDate: string;
  endDate: string;
}

export function promisifySearch(
  service: FaxServiceInstance,
  opts: SearchFaxOpts,
): Promise<FaxSearchResponse> {
  return new Promise((resolve, reject) => {
    service.search(
      opts.corpNum,
      opts.startDate,
      opts.endDate,
      [1, 2, 3, 4],  // state — all
      false,           // reserveYN
      false,           // senderOnly
      "D",             // order — descending
      1,               // page
      20,              // perPage
      "",              // qString
      (response) => resolve(response),
      (err) => reject(new Error(err.message)),
    );
  });
}

// ── Memoized Popbill FaxService factory ──────────────────────────────────────

let _cachedFaxService: FaxServiceInstance | null = null;

function getPopbillFaxService(): FaxServiceInstance {
  if (_cachedFaxService) return _cachedFaxService;

  const config = loadPopbillConfig();
  if (!config) {
    throw new Error("Popbill 설정이 없습니다. POPBILL_LINK_ID와 POPBILL_SECRET_KEY를 설정해주세요.");
  }
  const _require = createRequire(import.meta.url);
  const popbill = _require("popbill") as {
    config(opts: { LinkID: string; SecretKey: string; IsTest: boolean }): void;
    FaxService(): FaxServiceInstance;
  };
  popbill.config({
    LinkID: config.POPBILL_LINK_ID,
    SecretKey: config.POPBILL_SECRET_KEY,
    IsTest: config.POPBILL_IS_TEST,
  });
  _cachedFaxService = popbill.FaxService();
  return _cachedFaxService;
}

// ── Tool registration ─────────────────────────────────────────────────────────

async function handleSendFax(params: {
  corpNum: string; sender: string; receiver: string;
  receiverName: string; filePaths: string[]; title: string;
}) {
  try {
    const faxService = getPopbillFaxService();
    const receiptNum = await promisifySendFax(faxService, params);
    return formatResponse({ receiptNum });
  } catch (error) {
    return handleToolError(error);
  }
}

async function handleGetFaxStatus(params: { corpNum: string; receiptNum: string }) {
  try {
    const faxService = getPopbillFaxService();
    const results = await promisifyGetFaxResult(faxService, params.corpNum, params.receiptNum);
    return formatResponse(results);
  } catch (error) {
    return handleToolError(error);
  }
}

async function handleListFaxHistory(params: { corpNum: string; startDate: string; endDate: string }) {
  try {
    const faxService = getPopbillFaxService();
    const response = await promisifySearch(faxService, params);
    return formatResponse(response);
  } catch (error) {
    return handleToolError(error);
  }
}

export function registerFaxTools(server: McpServer): void {
  server.tool(
    "ecount_fax_send_fax",
    "팝빌 팩스 API를 통해 팩스를 발송합니다",
    {
      corpNum: z.string().describe("사업자번호 (10자리 숫자)"),
      sender: z.string().describe("발신자 번호"),
      receiver: z.string().describe("수신자 번호"),
      receiverName: z.string(),
      filePaths: z.array(z.string()).describe("전송할 파일 경로 목록"),
      title: z.string().optional().default(""),
    },
    handleSendFax,
  );

  server.tool(
    "ecount_fax_get_fax_status",
    "팩스 전송 결과를 조회합니다",
    { corpNum: z.string().describe("사업자번호 (10자리 숫자)"), receiptNum: z.string() },
    { readOnlyHint: true },
    handleGetFaxStatus,
  );

  server.tool(
    "ecount_fax_list_fax_history",
    "팩스 전송 내역을 조회합니다",
    { corpNum: z.string().describe("사업자번호 (10자리 숫자)"), startDate: z.string().describe("YYYYMMDD"), endDate: z.string().describe("YYYYMMDD") },
    { readOnlyHint: true },
    handleListFaxHistory,
  );
}
