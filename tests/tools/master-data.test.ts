import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMasterDataTools } from "../../src/tools/master-data.js";
import { EcountClient } from "../../src/client/ecount-client.js";
import type { EcountConfig } from "../../src/config.js";

const mockConfig: EcountConfig = {
  ECOUNT_COM_CODE: "TEST",
  ECOUNT_USER_ID: "user",
  ECOUNT_API_CERT_KEY: "key123",
  ECOUNT_ZONE: "AU1",
  ECOUNT_LAN_TYPE: "ko-KR",
};

describe("registerMasterDataTools", () => {
  it("should register all 11 master data tools without throwing", () => {
    const server = new McpServer({ name: "test", version: "0.1" });
    const client = new EcountClient(mockConfig);

    expect(() => registerMasterDataTools(server, client)).not.toThrow();
  });
});
