import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { EcountClient } from "./client/ecount-client.js";
import { loadConfig } from "./config.js";
import { registerAllTools } from "./tools/index.js";
import { logger } from "./utils/logger.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "ecount-erp",
    version: "1.0.0",
  });

  try {
    const config = loadConfig();
    const client = new EcountClient(config);
    registerAllTools(server, client, config);
    logger.info("ECOUNT ERP 도구 등록 완료");
  } catch (error) {
    logger.warn("ECOUNT 설정 누락 - 도구 미등록 상태로 시작", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return server;
}
