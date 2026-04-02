import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("Fax Tools", () => {
  describe("promisifySendFax", () => {
    it("should resolve with receiptNum on success", async () => {
      const { promisifySendFax } = await import("../../src/tools/fax.js");
      const mockService = {
        sendFax: vi.fn((_cn, _s, _r, _rn, _fp, _rdt, _sn, _ay, _t, _rq, _uid, success, _err) => {
          success("019032510331200001");
        }),
      };
      const result = await promisifySendFax(mockService as any, {
        corpNum: "1234567890",
        sender: "07012345678",
        receiver: "07098765432",
        receiverName: "수신자",
        filePaths: ["/tmp/test.pdf"],
        title: "팩스 제목",
      });
      expect(result).toBe("019032510331200001");
    });

    it("should reject with error on failure", async () => {
      const { promisifySendFax } = await import("../../src/tools/fax.js");
      const mockService = {
        sendFax: vi.fn((_cn, _s, _r, _rn, _fp, _rdt, _sn, _ay, _t, _rq, _uid, _success, error) => {
          error({ code: -99999999, message: "팝빌 서비스 오류" });
        }),
      };
      await expect(
        promisifySendFax(mockService as any, {
          corpNum: "1234567890",
          sender: "07012345678",
          receiver: "07098765432",
          receiverName: "수신자",
          filePaths: ["/tmp/test.pdf"],
          title: "팩스 제목",
        })
      ).rejects.toThrow("팝빌 서비스 오류");
    });
  });

  describe("promisifyGetFaxResult", () => {
    it("should resolve with results array", async () => {
      const { promisifyGetFaxResult } = await import("../../src/tools/fax.js");
      const mockResults = [
        { state: 3, result: 100, receiveNum: "07098765432", receiveName: "수신자", sendState: 3, title: "테스트" },
      ];
      const mockService = {
        getFaxResult: vi.fn((_cn, _rn, success, _err) => {
          success(mockResults);
        }),
      };
      const result = await promisifyGetFaxResult(mockService as any, "1234567890", "019032510331200001");
      expect(result).toEqual(mockResults);
    });
  });

  describe("promisifySearch", () => {
    it("should resolve with search response", async () => {
      const { promisifySearch } = await import("../../src/tools/fax.js");
      const mockResponse = { total: 1, perPage: 20, pageNum: 1, pageCount: 1, list: [] };
      const mockService = {
        search: vi.fn((_cn, _sd, _ed, _st, _ry, _so, _o, _p, _pp, _q, success, _err) => {
          success(mockResponse);
        }),
      };
      const result = await promisifySearch(mockService as any, {
        corpNum: "1234567890",
        startDate: "20260101",
        endDate: "20260331",
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("registerFaxTools", () => {
    it("should register 3 tools without throwing", async () => {
      const server = new McpServer({ name: "fax-test", version: "0.1" });
      const toolNames: string[] = [];
      vi.spyOn(server, "tool").mockImplementation((...args: unknown[]) => {
        toolNames.push(args[0] as string);
        return undefined as unknown as ReturnType<typeof server.tool>;
      });
      const { registerFaxTools } = await import("../../src/tools/fax.js");
      registerFaxTools(server);
      expect(toolNames).toContain("ecount_send_fax");
      expect(toolNames).toContain("ecount_get_fax_status");
      expect(toolNames).toContain("ecount_list_fax_history");
      expect(toolNames).toHaveLength(3);
    });

    it("should register even when popbill SDK is not available", async () => {
      const server = new McpServer({ name: "fax-no-sdk", version: "0.1" });
      const toolSpy = vi.spyOn(server, "tool").mockImplementation((..._args: unknown[]) => {
        return undefined as unknown as ReturnType<typeof server.tool>;
      });
      const { registerFaxTools } = await import("../../src/tools/fax.js");
      registerFaxTools(server);
      expect(toolSpy).toHaveBeenCalledTimes(3);
      toolSpy.mockRestore();
    });
  });
});
