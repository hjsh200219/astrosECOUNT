import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import {
  getExchangeRate as getServiceRate,
  listExchangeRates as listServiceRates,
  fetchMarketRates,
  fetchCustomsRates,
  type ExchangeRateEntry,
} from "../services/exchange-rate.js";

// ---------------------------------------------------------------------------
// ExchangeRate interface (kept for backward compatibility)
// ---------------------------------------------------------------------------

export interface ExchangeRate {
  currency: string;  // "USD", "BRL", "EUR"
  rate: number;      // KRW per unit
  source: string;    // "manual" | "api" | "customs-unipass" | "customs-gov"
  date: string;      // YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// Manual override Map (used by set_exchange_rate when API is down)
// ---------------------------------------------------------------------------

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const MANUAL_OVERRIDES: Map<string, ExchangeRate> = new Map();

// ---------------------------------------------------------------------------
// getExchangeRate -- check manual overrides first, then API cache
// ---------------------------------------------------------------------------

export async function getExchangeRate(
  currency: string,
  type: "market" | "customs" = "market",
): Promise<ExchangeRate | null> {
  const upper = currency.toUpperCase();

  // Manual overrides take priority
  const manual = MANUAL_OVERRIDES.get(upper);
  if (manual) return manual;

  // Fall through to service (API cache)
  const entry = await getServiceRate(upper, type);
  if (!entry) return null;
  return {
    currency: entry.currency,
    rate: entry.rate,
    source: entry.source,
    date: entry.date,
  };
}

// ---------------------------------------------------------------------------
// setExchangeRate -- manual override
// ---------------------------------------------------------------------------

export function setExchangeRate(currency: string, rate: number, source = "manual"): ExchangeRate {
  const entry: ExchangeRate = {
    currency: currency.toUpperCase(),
    rate,
    source,
    date: today(),
  };
  MANUAL_OVERRIDES.set(entry.currency, entry);
  return entry;
}

// ---------------------------------------------------------------------------
// listExchangeRates -- merge manual overrides with API cache
// ---------------------------------------------------------------------------

export async function listExchangeRates(): Promise<{
  manual: ExchangeRate[];
  market: ExchangeRateEntry[];
  customs: ExchangeRateEntry[];
}> {
  const manual = Array.from(MANUAL_OVERRIDES.values());
  const { market, customs } = await listServiceRates();
  return { manual, market, customs };
}

// ---------------------------------------------------------------------------
// calculateKrw -- currency conversion
// ---------------------------------------------------------------------------

export async function calculateKrw(
  amount: number,
  currency: string,
): Promise<{ krw: number; rate: number; currency: string } | null> {
  const entry = await getExchangeRate(currency);
  if (!entry) return null;
  return {
    krw: amount * entry.rate,
    rate: entry.rate,
    currency: entry.currency,
  };
}

// ---------------------------------------------------------------------------
// Shipment rate validation types
// ---------------------------------------------------------------------------

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

export async function validateShipmentRates(
  shipments: { blNumber: string; blDate: string; currency: string }[],
): Promise<RateValidationResult> {
  const checks: ShipmentRateCheck[] = [];

  for (const s of shipments) {
    const entry = await getExchangeRate(s.currency);
    if (entry) {
      checks.push({
        blNumber: s.blNumber,
        blDate: s.blDate,
        currency: s.currency.toUpperCase(),
        hasRate: true,
        rate: entry.rate,
        message: "환율 적용 가능",
      });
    } else {
      checks.push({
        blNumber: s.blNumber,
        blDate: s.blDate,
        currency: s.currency.toUpperCase(),
        hasRate: false,
        message: `환율 미등록 — ${s.currency.toUpperCase()} 환율을 설정해주세요`,
      });
    }
  }

  const coveredCount = checks.filter((c) => c.hasRate).length;
  const missingCount = checks.length - coveredCount;
  const coverageRate = checks.length === 0 ? 0 : coveredCount / checks.length;

  return { checks, missingCount, coveredCount, coverageRate };
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerExchangeRateTools(server: McpServer): void {
  server.tool(
    "ecount_get_exchange_rate",
    "통화 코드로 현재 환율을 조회합니다. 수동 설정값 우선, 없으면 API 캐시에서 조회합니다.",
    {
      currency: z.string().describe("통화 코드 (예: USD, BRL, EUR)"),
      type: z.enum(["market", "customs"]).optional().describe("환율 유형: market(시장환율) 또는 customs(관세환율). 기본값: market"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const type = (params.type as "market" | "customs" | undefined) ?? "market";
        const result = await getExchangeRate(params.currency as string, type);
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
    "통화 환율을 수동으로 설정하거나 업데이트합니다. API 장애 시 수동 오버라이드에 유용합니다.",
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
    "수동 오버라이드, 시장환율(한국수출입은행), 관세환율(UNI-PASS/공공데이터) 전체 목록을 반환합니다.",
    {},
    { readOnlyHint: true },
    async () => {
      try {
        const rates = await listExchangeRates();
        return formatResponse({
          manualOverrides: { count: rates.manual.length, rates: rates.manual },
          marketRates: { count: rates.market.length, rates: rates.market },
          customsRates: { count: rates.customs.length, rates: rates.customs },
        });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_convert_currency",
    "외화 금액을 KRW(원화)로 환산합니다. 수동 설정값 우선, 없으면 API 캐시에서 조회합니다.",
    {
      amount: z.number().positive().describe("환산할 금액"),
      currency: z.string().describe("통화 코드 (예: USD, BRL, EUR)"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const result = await calculateKrw(params.amount as number, params.currency as string);
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
        const result = await validateShipmentRates(
          params.shipments as { blNumber: string; blDate: string; currency: string }[],
        );
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // --- New tools: force refresh ---

  server.tool(
    "ecount_refresh_market_rates",
    "한국수출입은행 시장환율을 강제로 새로고침합니다. 캐시를 무시하고 최신 데이터를 가져옵니다.",
    {},
    { readOnlyHint: true },
    async () => {
      try {
        const rates = await fetchMarketRates();
        if (rates.length === 0) {
          return formatResponse({ success: false, message: "시장환율을 가져올 수 없습니다. API 키를 확인해주세요." });
        }
        return formatResponse({ success: true, count: rates.length, rates });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_refresh_customs_rates",
    "관세환율(UNI-PASS/공공데이터)을 강제로 새로고침합니다. 캐시를 무시하고 최신 데이터를 가져옵니다.",
    {},
    { readOnlyHint: true },
    async () => {
      try {
        const rates = await fetchCustomsRates();
        if (rates.length === 0) {
          return formatResponse({ success: false, message: "관세환율을 가져올 수 없습니다. API 키를 확인해주세요." });
        }
        return formatResponse({ success: true, count: rates.length, rates });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
