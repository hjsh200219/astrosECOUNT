import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EcountClient } from "../client/ecount-client.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export type ToolType = "save" | "query";

export interface ToolDefinition {
  name: string;
  description: string;
  endpoint: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  /** "save" wraps params in {listKey: [{BulkDatas: params}]}, "query" sends params directly */
  type: ToolType;
  /** For save-type tools, the wrapper key name (e.g. "SaleList", "ProductList") */
  listKey?: string;
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
    const handler = async (params: Record<string, unknown>) => {
      try {
        let body: Record<string, unknown>;
        if (tool.type === "save" && tool.listKey) {
          body = {
            [tool.listKey]: [{ BulkDatas: params }],
          };
        } else {
          body = params;
        }
        const result = await client.post(tool.endpoint, body);
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    };

    if (tool.annotations) {
      server.tool(tool.name, tool.description, tool.inputSchema, tool.annotations, handler);
    } else {
      server.tool(tool.name, tool.description, tool.inputSchema, handler);
    }
  }
}
