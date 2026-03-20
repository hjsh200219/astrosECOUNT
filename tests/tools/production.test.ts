import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerProductionTools } from "../../src/tools/production.js";
import { EcountClient } from "../../src/client/ecount-client.js";

const mockConfig = { ECOUNT_COM_CODE: "TEST", ECOUNT_USER_ID: "user", ECOUNT_API_CERT_KEY: "key123", ECOUNT_ZONE: "AU1", ECOUNT_LAN_TYPE: "ko-KR" };

describe("registerProductionTools", () => {
  it("should register all 6 production tools without throwing", () => {
    const server = new McpServer({ name: "test", version: "0.1" });
    const client = new EcountClient(mockConfig);
    expect(() => registerProductionTools(server, client)).not.toThrow();
  });
});
