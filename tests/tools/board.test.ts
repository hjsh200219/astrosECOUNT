import { describe, it, expect } from "vitest";

describe("registerBoardTools", () => {
  it("should register tools without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerBoardTools } = await import("../../src/tools/board.js");
    const { EcountClient } = await import("../../src/client/ecount-client.js");

    const server = new McpServer({ name: "test", version: "0.1" });
    const client = new EcountClient({
      ECOUNT_COM_CODE: "000000",
      ECOUNT_USER_ID: "test",
      ECOUNT_API_CERT_KEY: "key",
      ECOUNT_ZONE: "AU1",
      ECOUNT_LAN_TYPE: "ko-KR",
      ECOUNT_API_MODE: "production",
    });

    expect(() => registerBoardTools(server, client)).not.toThrow();
  });
});
