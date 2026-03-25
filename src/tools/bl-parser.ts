import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface BLParseResult {
  blNumber: string;
  carrier: string;
  valid: boolean;
  prefix: string;
}

interface CarrierPattern {
  carrier: string;
  prefixes: string[];
}

const CARRIER_PATTERNS: CarrierPattern[] = [
  { carrier: "COSCO", prefixes: ["COSU", "COAU", "CCLU"] },
  { carrier: "ONE", prefixes: ["ONEY"] },
  { carrier: "HMM", prefixes: ["HDMU", "HMDU"] },
  { carrier: "MSC", prefixes: ["MEDU", "MSCU"] },
  { carrier: "Evergreen", prefixes: ["EISU", "EGHU", "EMCU"] },
  { carrier: "PIL", prefixes: ["PCIU"] },
  { carrier: "Maersk", prefixes: ["MAEU", "MRKU", "MSKU"] },
  { carrier: "CMA CGM", prefixes: ["CMAU", "CGMU"] },
  { carrier: "Yang Ming", prefixes: ["YMLU", "YMMU"] },
  { carrier: "ZIM", prefixes: ["ZIMU"] },
];

export function parseBL(input: string): BLParseResult {
  const blNumber = input.trim().toUpperCase();

  if (!blNumber) {
    return { blNumber: "", carrier: "UNKNOWN", valid: false, prefix: "" };
  }

  const prefix = blNumber.substring(0, 4);

  for (const pattern of CARRIER_PATTERNS) {
    if (pattern.prefixes.includes(prefix)) {
      return {
        blNumber,
        carrier: pattern.carrier,
        valid: true,
        prefix,
      };
    }
  }

  return { blNumber, carrier: "UNKNOWN", valid: false, prefix };
}

export function registerBLParserTool(server: McpServer): void {
  server.tool(
    "ecount_parse_bl",
    "BL(선하증권) 번호를 분석하여 선사를 자동 식별합니다. COSCO, ONE, HMM, MSC, Evergreen, PIL 등을 지원합니다.",
    {
      bl_number: z.string().describe("BL 번호 (예: COSU6453445610)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = parseBL(params.bl_number as string);
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
