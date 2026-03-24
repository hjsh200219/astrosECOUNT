import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import { NetworkError } from "../utils/error-handler.js";
import { logger } from "../utils/logger.js";

export function registerConnectionTools(server: McpServer, client: EcountClient): void {
  server.tool(
    "ecount_zone",
    "ECOUNT ERP Zone 정보를 조회합니다. 회사코드로 해당 회사의 Zone과 도메인 정보를 확인할 때 사용합니다.",
    {
      COM_CODE: z.string().describe("회사코드 (6자리)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const url = "https://sboapi.ecount.com/OAPI/V2/Zone";
        logger.debug("ECOUNT Zone API 호출", { COM_CODE: params.COM_CODE });

        let response: Response;
        try {
          response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ COM_CODE: params.COM_CODE }),
            signal: AbortSignal.timeout(30_000),
          });
        } catch (error) {
          throw new NetworkError(
            `ECOUNT Zone API 연결 실패: ${error instanceof Error ? error.message : String(error)}`
          );
        }

        const data = await response.json();
        return formatResponse(data);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_login",
    "ECOUNT ERP에 수동으로 로그인합니다. 세션 상태를 확인하거나 강제 재로그인할 때 사용합니다.",
    {},
    async () => {
      try {
        const sessionId = await client.sessionManager.forceRefresh();
        return formatResponse({
          success: true,
          message: "로그인 성공",
          sessionIdPrefix: sessionId.substring(0, 8) + "...",
        });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_status",
    "현재 ECOUNT ERP 세션 상태를 조회합니다. 세션이 유효한지 확인할 때 사용합니다.",
    {},
    async () => {
      try {
        const status = client.sessionManager.getStatus();
        return formatResponse({
          connected: status.hasSession,
          sessionIdPrefix: status.sessionIdPrefix,
          message: status.hasSession ? "세션 활성 상태" : "세션 없음 - 다음 API 호출 시 자동 로그인",
        });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
