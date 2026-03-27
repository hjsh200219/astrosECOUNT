import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface ExchangeRate {
  currency: string;  // "USD", "BRL", "EUR"
  rate: number;      // KRW per unit
  source: string;    // "manual" | "api"
  date: string;      // YYYY-MM-DD
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EXCHANGE_RATES: Map<string, ExchangeRate> = new Map([
  ["USD", { currency: "USD", rate: 1350, source: "manual", date: today() }],
  ["BRL", { currency: "BRL", rate: 270,  source: "manual", date: today() }],
  ["EUR", { currency: "EUR", rate: 1470, source: "manual", date: today() }],
]);

export function getExchangeRate(currency: string, _date?: string): ExchangeRate | null {
  return EXCHANGE_RATES.get(currency.toUpperCase()) ?? null;
}

export function setExchangeRate(currency: string, rate: number, source = "manual"): ExchangeRate {
  const entry: ExchangeRate = {
    currency: currency.toUpperCase(),
    rate,
    source,
    date: today(),
  };
  EXCHANGE_RATES.set(entry.currency, entry);
  return entry;
}

export function listExchangeRates(): ExchangeRate[] {
  return Array.from(EXCHANGE_RATES.values());
}

export function calculateKrw(
  amount: number,
  currency: string,
): { krw: number; rate: number; currency: string } | null {
  const entry = getExchangeRate(currency);
  if (!entry) return null;
  return {
    krw: amount * entry.rate,
    rate: entry.rate,
    currency: entry.currency,
  };
}

export interface ShipmentRateCheck {
  blNumber: string;
  blDate: string;      // YYYY-MM-DD
  currency: string;
  hasRate: boolean;
  rate?: number;
  message: string;
}

export interface RateValidationResult {
  checks: ShipmentRateCheck[];
  missingCount: number;
  coveredCount: number;
  coverageRate: number;  // 0-1
}

export function validateShipmentRates(
  shipments: { blNumber: string; blDate: string; currency: string }[],
): RateValidationResult {
  const checks: ShipmentRateCheck[] = shipments.map((s) => {
    const entry = getExchangeRate(s.currency);
    if (entry) {
      return {
        blNumber: s.blNumber,
        blDate: s.blDate,
        currency: s.currency.toUpperCase(),
        hasRate: true,
        rate: entry.rate,
        message: "환율 적용 가능",
      };
    }
    return {
      blNumber: s.blNumber,
      blDate: s.blDate,
      currency: s.currency.toUpperCase(),
      hasRate: false,
      message: `환율 미등록 — ${s.currency.toUpperCase()} 환율을 설정해주세요`,
    };
  });

  const coveredCount = checks.filter((c) => c.hasRate).length;
  const missingCount = checks.length - coveredCount;
  const coverageRate = checks.length === 0 ? 0 : coveredCount / checks.length;

  return { checks, missingCount, coveredCount, coverageRate };
}

export function registerExchangeRateTools(server: McpServer): void {
  server.tool(
    "ecount_get_exchange_rate",
    "통화 코드로 현재 환율을 조회합니다. (예: USD, BRL, EUR)",
    {
      currency: z.string().describe("통화 코드 (예: USD, BRL, EUR)"),
      date: z.string().optional().describe("조회 날짜 YYYY-MM-DD (현재는 무시됨, 향후 지원 예정)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = getExchangeRate(params.currency as string, params.date as string | undefined);
        if (!result) {
          return formatResponse({ found: false, message: `통화 '${params.currency}'의 환율 정보가 없습니다.` });
        }
        return formatResponse({ found: true, exchangeRate: result });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_set_exchange_rate",
    "통화 환율을 수동으로 설정하거나 업데이트합니다.",
    {
      currency: z.string().describe("통화 코드 (예: USD, BRL, EUR)"),
      rate: z.number().positive().describe("KRW 기준 환율 (예: 1350)"),
      source: z.string().optional().describe("환율 출처 (기본값: manual)"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (params: Record<string, unknown>) => {
      try {
        const result = setExchangeRate(
          params.currency as string,
          params.rate as number,
          (params.source as string | undefined) ?? "manual",
        );
        return formatResponse({ success: true, exchangeRate: result });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_list_exchange_rates",
    "저장된 모든 환율 목록을 반환합니다.",
    {},
    { readOnlyHint: true },
    async () => {
      try {
        const rates = listExchangeRates();
        return formatResponse({ count: rates.length, exchangeRates: rates });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_convert_currency",
    "외화 금액을 KRW(원화)로 환산합니다.",
    {
      amount: z.number().positive().describe("환산할 금액"),
      currency: z.string().describe("통화 코드 (예: USD, BRL, EUR)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = calculateKrw(params.amount as number, params.currency as string);
        if (!result) {
          return formatResponse({ found: false, message: `통화 '${params.currency}'의 환율 정보가 없습니다.` });
        }
        return formatResponse({
          found: true,
          amount: params.amount,
          ...result,
        });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_validate_shipment_rates",
    "BL 선적 목록에 대해 통화별 환율 등록 여부를 일괄 검증합니다.",
    {
      shipments: z.array(
        z.object({
          blNumber: z.string().describe("BL 번호"),
          blDate: z.string().describe("BL 날짜 (YYYY-MM-DD)"),
          currency: z.string().describe("통화 코드 (예: USD, BRL, EUR)"),
        }),
      ).describe("검증할 선적 목록"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = validateShipmentRates(
          params.shipments as { blNumber: string; blDate: string; currency: string }[],
        );
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
