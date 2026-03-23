#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { logger } from "./utils/logger.js";

async function main() {
  logger.info("ECOUNT ERP MCP Server starting...");

  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  logger.info("ECOUNT ERP MCP Server running on stdio");
}

main().catch((error) => {
  logger.error("Failed to start server", { error: String(error) });
  process.exit(1);
});
