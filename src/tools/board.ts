import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export function registerBoardTools(server: McpServer, client: EcountClient): void {
  server.tool(
    "ecount_create_board",
    "ECOUNT ERP 게시판에 글을 등록합니다. 게시판ID를 지정하여 새 글을 작성할 때 사용합니다. (V3 API)",
    {
      bizz_sid: z.string().describe("게시판 ID (예: B_000000E072000)"),
      title: z.string().optional().describe("제목 (최대 200자)"),
      body_ctt: z.string().optional().describe("내용 (텍스트, 최대 5MB)"),
      progress_status: z.string().optional().describe("진행상태 코드 또는 명"),
      label: z.string().optional().describe("라벨 코드 또는 명"),
      cust: z.string().optional().describe("거래처코드"),
      cust_nm: z.string().optional().describe("거래처명"),
      prod: z.string().optional().describe("품목코드"),
      prod_nm: z.string().optional().describe("품목명"),
      dept: z.string().optional().describe("부서코드"),
      dept_nm: z.string().optional().describe("부서명"),
      pjt: z.string().optional().describe("프로젝트코드"),
      pjt_nm: z.string().optional().describe("프로젝트명"),
      pic: z.string().optional().describe("담당자코드"),
      pic_nm: z.string().optional().describe("담당자명"),
      complt_dtm: z.string().optional().describe("완료일시 (YYYYMMDD HH:MM)"),
      record_range_dtm: z.string().optional().describe("날짜/시간 (YYYYMMDD HH:MM HH:MM)"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (params: Record<string, unknown>) => {
      try {
        const master: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== "") {
            master[key] = value;
          }
        }

        const body = {
          data: [{ master }],
        };

        const result = await client.postRaw(
          "/ec5/api/app.oapi.v3/action/CreateOApiBoardAction",
          body
        );
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
