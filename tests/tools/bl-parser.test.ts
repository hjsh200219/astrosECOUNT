import { describe, it, expect } from "vitest";
import { parseBL, type BLParseResult } from "../../src/tools/bl-parser.js";

describe("parseBL", () => {
  describe("COSCO", () => {
    it("should identify COSCO by COSU prefix + 10 digits", () => {
      const result = parseBL("COSU6453445610");
      expect(result.carrier).toBe("COSCO");
      expect(result.valid).toBe(true);
      expect(result.blNumber).toBe("COSU6453445610");
    });

    it("should identify COSCO by COAU prefix", () => {
      const result = parseBL("COAU1234567890");
      expect(result.carrier).toBe("COSCO");
      expect(result.valid).toBe(true);
    });
  });

  describe("ONE (Ocean Network Express)", () => {
    it("should identify ONE by ONEY prefix", () => {
      const result = parseBL("ONEYSAOG12345678");
      expect(result.carrier).toBe("ONE");
      expect(result.valid).toBe(true);
    });
  });

  describe("HMM", () => {
    it("should identify HMM by HDMU prefix + 10 digits", () => {
      const result = parseBL("HDMU1234567890");
      expect(result.carrier).toBe("HMM");
      expect(result.valid).toBe(true);
    });

    it("should identify HMM by HMDU prefix", () => {
      const result = parseBL("HMDU9876543210");
      expect(result.carrier).toBe("HMM");
      expect(result.valid).toBe(true);
    });
  });

  describe("MSC", () => {
    it("should identify MSC by MEDU prefix", () => {
      const result = parseBL("MEDU1234567890");
      expect(result.carrier).toBe("MSC");
      expect(result.valid).toBe(true);
    });

    it("should identify MSC by MSCU prefix", () => {
      const result = parseBL("MSCU1234567890");
      expect(result.carrier).toBe("MSC");
      expect(result.valid).toBe(true);
    });
  });

  describe("Evergreen", () => {
    it("should identify Evergreen by EISU prefix", () => {
      const result = parseBL("EISU1234567890");
      expect(result.carrier).toBe("Evergreen");
      expect(result.valid).toBe(true);
    });

    it("should identify Evergreen by EGHU prefix", () => {
      const result = parseBL("EGHU9876543210");
      expect(result.carrier).toBe("Evergreen");
      expect(result.valid).toBe(true);
    });
  });

  describe("PIL", () => {
    it("should identify PIL by PCIU prefix", () => {
      const result = parseBL("PCIU1234567890");
      expect(result.carrier).toBe("PIL");
      expect(result.valid).toBe(true);
    });
  });

  describe("Maersk", () => {
    it("should identify Maersk by MAEU prefix", () => {
      const result = parseBL("MAEU1234567890");
      expect(result.carrier).toBe("Maersk");
      expect(result.valid).toBe(true);
    });

    it("should identify Maersk by MRKU prefix", () => {
      const result = parseBL("MRKU9876543210");
      expect(result.carrier).toBe("Maersk");
      expect(result.valid).toBe(true);
    });

    it("should identify Maersk by MSKU prefix (not MSC)", () => {
      const result = parseBL("MSKU1234567890");
      expect(result.carrier).toBe("Maersk");
      expect(result.valid).toBe(true);
    });
  });

  describe("CMA CGM", () => {
    it("should identify CMA CGM by CMAU prefix", () => {
      const result = parseBL("CMAU1234567890");
      expect(result.carrier).toBe("CMA CGM");
      expect(result.valid).toBe(true);
    });
  });

  describe("Yang Ming", () => {
    it("should identify Yang Ming by YMLU prefix", () => {
      const result = parseBL("YMLU1234567890");
      expect(result.carrier).toBe("Yang Ming");
      expect(result.valid).toBe(true);
    });
  });

  describe("ZIM", () => {
    it("should identify ZIM by ZIMU prefix", () => {
      const result = parseBL("ZIMU1234567890");
      expect(result.carrier).toBe("ZIM");
      expect(result.valid).toBe(true);
    });
  });

  describe("unknown/invalid", () => {
    it("should return unknown for unrecognized prefix", () => {
      const result = parseBL("XXXX1234567890");
      expect(result.carrier).toBe("UNKNOWN");
      expect(result.valid).toBe(false);
    });

    it("should return unknown for empty string", () => {
      const result = parseBL("");
      expect(result.carrier).toBe("UNKNOWN");
      expect(result.valid).toBe(false);
    });

    it("should trim whitespace", () => {
      const result = parseBL("  COSU6453445610  ");
      expect(result.carrier).toBe("COSCO");
      expect(result.valid).toBe(true);
    });

    it("should be case-insensitive", () => {
      const result = parseBL("cosu6453445610");
      expect(result.carrier).toBe("COSCO");
      expect(result.valid).toBe(true);
    });
  });
});

describe("registerBLParserTool", () => {
  it("should register ecount_parse_bl tool without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerBLParserTool } = await import("../../src/tools/bl-parser.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerBLParserTool(server)).not.toThrow();
  });
});
