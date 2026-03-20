import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerOtherTools } from "../../src/tools/other.js";
import { EcountClient } from "../../src/client/ecount-client.js";

const mockConfig = { ECOUNT_COM_CODE: "TEST", ECOUNT_USER_ID: "user", ECOUNT_API_CERT_KEY: "key123", ECOUNT_ZONE: "AU1", ECOUNT_LAN_TYPE: "ko-KR" };

describe("registerOtherTools", () => {
  it("should register all 3 other tools without throwing", () => {
    const server = new McpServer({ name: "test", version: "0.1" });
    const client = new EcountClient(mockConfig);
    expect(() => registerOtherTools(server, client)).not.toThrow();
  });
});
