import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools, type ToolDefinition } from "../../src/tools/tool-factory.js";
import { EcountClient } from "../../src/client/ecount-client.js";
import type { EcountConfig } from "../../src/config.js";
import { z } from "zod";

const mockConfig: EcountConfig = {
  ECOUNT_COM_CODE: "TEST",
  ECOUNT_USER_ID: "user",
  ECOUNT_API_CERT_KEY: "key123",
  ECOUNT_ZONE: "AU1",
  ECOUNT_LAN_TYPE: "ko-KR",
};

describe("registerTools (Tool Factory)", () => {
  it("should register tools on the server without throwing", () => {
    const server = new McpServer({ name: "test", version: "0.1" });
    const client = new EcountClient(mockConfig);

    const tools: ToolDefinition[] = [
      {
        name: "test_tool",
        description: "A test tool",
        endpoint: "Test/TestEndpoint",
        inputSchema: {
          param1: z.string().describe("Test param"),
        },
      },
    ];

    expect(() => registerTools(server, client, tools)).not.toThrow();
  });

  it("should register multiple tools", () => {
    const server = new McpServer({ name: "test", version: "0.1" });
    const client = new EcountClient(mockConfig);

    const tools: ToolDefinition[] = [
      { name: "tool_a", description: "Tool A", endpoint: "A/A", inputSchema: {} },
      { name: "tool_b", description: "Tool B", endpoint: "B/B", inputSchema: {} },
      { name: "tool_c", description: "Tool C", endpoint: "C/C", inputSchema: {} },
    ];

    expect(() => registerTools(server, client, tools)).not.toThrow();
  });

  it("should register tools with annotations without throwing", () => {
    const server = new McpServer({ name: "test", version: "0.1" });
    const client = new EcountClient(mockConfig);

    const tools: ToolDefinition[] = [
      {
        name: "tool_readonly",
        description: "Read-only tool",
        endpoint: "X/X",
        inputSchema: {},
        annotations: { readOnlyHint: true },
      },
    ];

    expect(() => registerTools(server, client, tools)).not.toThrow();
  });
});
