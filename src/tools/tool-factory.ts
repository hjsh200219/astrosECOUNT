import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface ToolDefinition {
  name: string;
  description: string;
  endpoint: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    openWorldHint?: boolean;
  };
}

export function registerTools(
  server: McpServer,
  client: EcountClient,
  tools: ToolDefinition[]
): void {
  for (const tool of tools) {
    if (tool.annotations) {
      server.tool(
        tool.name,
        tool.description,
        tool.inputSchema,
        tool.annotations,
        async (params) => {
          try {
            const result = await client.post(tool.endpoint, params);
            return formatResponse(result);
          } catch (error) {
            return handleToolError(error);
          }
        }
      );
    } else {
      server.tool(
        tool.name,
        tool.description,
        tool.inputSchema,
        async (params) => {
          try {
            const result = await client.post(tool.endpoint, params);
            return formatResponse(result);
          } catch (error) {
            return handleToolError(error);
          }
        }
      );
    }
  }
}
