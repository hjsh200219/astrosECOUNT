import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSalesTools } from "../../src/tools/sales.js";
import { EcountClient } from "../../src/client/ecount-client.js";

const mockConfig = {
  ECOUNT_COM_CODE: "TEST",
  ECOUNT_USER_ID: "user",
  ECOUNT_API_CERT_KEY: "key123",
  ECOUNT_ZONE: "AU1",
  ECOUNT_LAN_TYPE: "ko-KR",
};

describe("registerSalesTools", () => {
  it("should register all 12 sales tools without throwing", () => {
    const server = new McpServer({ name: "test", version: "0.1" });
    const client = new EcountClient(mockConfig);
    expect(() => registerSalesTools(server, client)).not.toThrow();
  });
});
