import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerConnectionTools } from "../../src/tools/connection.js";
import { EcountClient } from "../../src/client/ecount-client.js";
import type { EcountConfig } from "../../src/config.js";

const mockConfig: EcountConfig = {
  ECOUNT_COM_CODE: "TEST",
  ECOUNT_USER_ID: "user",
  ECOUNT_API_CERT_KEY: "key123",
  ECOUNT_ZONE: "AU1",
  ECOUNT_LAN_TYPE: "ko-KR",
};

describe("registerConnectionTools", () => {
  it("should register ecount_login and ecount_status tools without throwing", () => {
    const server = new McpServer({ name: "test", version: "0.1" });
    const client = new EcountClient(mockConfig);

    // Should not throw
    expect(() => registerConnectionTools(server, client)).not.toThrow();
  });

  it("should register exactly three tools", () => {
    const server = new McpServer({ name: "test", version: "0.1" });
    const client = new EcountClient(mockConfig);

    const toolSpy = vi.spyOn(server, "tool");
    registerConnectionTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(3);
    expect(toolSpy).toHaveBeenCalledWith(
      "ecount_zone",
      expect.any(String),
      expect.any(Object),
      expect.any(Object),
      expect.any(Function)
    );
    expect(toolSpy).toHaveBeenCalledWith(
      "ecount_login",
      expect.any(String),
      {},
      expect.any(Function)
    );
    expect(toolSpy).toHaveBeenCalledWith(
      "ecount_status",
      expect.any(String),
      {},
      expect.any(Function)
    );
  });

  describe("ecount_login tool handler", () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("should return success response with sessionIdPrefix on successful login", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            Status: "200",
            Error: null,
            Data: { Datas: { SESSION_ID: "abcdefghijklmnop" } },
          }),
      }) as unknown as typeof fetch;

      const server = new McpServer({ name: "test", version: "0.1" });
      const client = new EcountClient(mockConfig);

      // Capture the handler by intercepting tool registration
      let loginHandler: (() => Promise<unknown>) | null = null;
      const toolSpy = vi.spyOn(server, "tool").mockImplementation(
        (name: string, _desc: unknown, _schema: unknown, handler: unknown) => {
          if (name === "ecount_login") {
            loginHandler = handler as () => Promise<unknown>;
          }
          return {} as ReturnType<typeof server.tool>;
        }
      );

      registerConnectionTools(server, client);
      toolSpy.mockRestore();

      expect(loginHandler).not.toBeNull();
      const result = await loginHandler!();

      expect(result).toMatchObject({
        content: [
          {
            type: "text",
            text: expect.stringContaining("로그인 성공"),
          },
        ],
      });
    });

    it("should return error response on login failure", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("network error")) as unknown as typeof fetch;

      const server = new McpServer({ name: "test", version: "0.1" });
      const client = new EcountClient(mockConfig);

      let loginHandler: (() => Promise<unknown>) | null = null;
      const toolSpy = vi.spyOn(server, "tool").mockImplementation(
        (name: string, _desc: unknown, _schema: unknown, handler: unknown) => {
          if (name === "ecount_login") {
            loginHandler = handler as () => Promise<unknown>;
          }
          return {} as ReturnType<typeof server.tool>;
        }
      );

      registerConnectionTools(server, client);
      toolSpy.mockRestore();

      expect(loginHandler).not.toBeNull();
      const result = await loginHandler!();

      expect(result).toMatchObject({
        isError: true,
        content: [{ type: "text" }],
      });
    });
  });

  describe("ecount_status tool handler", () => {
    it("should return no-session status when not logged in", async () => {
      const server = new McpServer({ name: "test", version: "0.1" });
      const client = new EcountClient(mockConfig);

      let statusHandler: (() => Promise<unknown>) | null = null;
      const toolSpy = vi.spyOn(server, "tool").mockImplementation(
        (name: string, _desc: unknown, _schema: unknown, handler: unknown) => {
          if (name === "ecount_status") {
            statusHandler = handler as () => Promise<unknown>;
          }
          return {} as ReturnType<typeof server.tool>;
        }
      );

      registerConnectionTools(server, client);
      toolSpy.mockRestore();

      expect(statusHandler).not.toBeNull();
      const result = (await statusHandler!()) as { content: { text: string }[] };

      const text = result.content[0].text;
      expect(text).toContain("false");
      expect(text).toContain("자동 로그인");
    });
  });
});
