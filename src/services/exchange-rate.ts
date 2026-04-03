/**
 * Exchange Rate Service
 *
 * Fetches live exchange rates from two sources:
 * 1. Market rates  - 한국수출입은행 (Korea Exim Bank)
 * 2. Customs rates - UNI-PASS API012 (primary) + 공공데이터포털 (fallback)
 *
 * In-memory cache with TTL (no Supabase dependency).
 */

import { fetchCustomsExchangeRates } from "./unipass/customs-rate.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExchangeRateEntry {
  currency: string;
  rate: number;
  source: "api" | "customs-unipass" | "customs-gov" | "manual";
  date: string; // YYYY-MM-DD
}

interface CacheEntry<T> {
  data: T;
  fetchedAt: number; // Date.now()
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MARKET_TTL_MS = 60 * 60 * 1000; // 1 hour
const CUSTOMS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const DEFAULT_TIMEOUT_MS = 15_000;

const KOREAEXIM_URL =
  "https://www.koreaexim.go.kr/site/program/financial/exchangeJSON";

const GOV_CUSTOMS_URL =
  "http://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo";

const TARGET_CURRENCIES = ["USD", "EUR", "JPY"];

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let marketCache: CacheEntry<ExchangeRateEntry[]> | null = null;
let customsCache: CacheEntry<ExchangeRateEntry[]> | null = null;

function isFresh(entry: CacheEntry<unknown> | null, ttlMs: number): boolean {
  if (!entry) return false;
  return Date.now() - entry.fetchedAt < ttlMs;
}

/** Exported for testing -- reset all caches. */
export function _resetCache(): void {
  marketCache = null;
  customsCache = null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function todayCompact(): string {
  return todayStr().replace(/-/g, "");
}

// ---------------------------------------------------------------------------
// 1. Market rates -- 한국수출입은행
// ---------------------------------------------------------------------------

interface KoreaEximItem {
  cur_unit: string; // "USD", "EUR", "JPY(100)"
  deal_bas_r: string; // "1,350.5"
  cur_nm: string;
}

/**
 * Fetch market exchange rates from 한국수출입은행 API.
 *
 * The API uses cookie-based auth: the first request may return HTTP 302 with
 * a Set-Cookie header. We detect this and retry with the cookie attached.
 */
export async function fetchMarketRates(): Promise<ExchangeRateEntry[]> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) return [];

  const url = new URL(KOREAEXIM_URL);
  url.searchParams.set("authkey", apiKey);
  url.searchParams.set("searchdate", todayCompact());
  url.searchParams.set("data", "AP01");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    let response = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
      redirect: "manual", // capture 302
    });

    // Handle cookie-based auth: 302 + Set-Cookie -> retry with cookie
    if (response.status === 302 || response.status === 301) {
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) {
        const cookie = setCookie.split(";")[0]; // take only the key=value part
        response = await fetch(url.toString(), {
          method: "GET",
          signal: controller.signal,
          headers: { Cookie: cookie },
        });
      }
    }

    if (!response.ok) return [];

    const body = await response.text();
    if (!body || body.trim() === "") return [];

    let items: KoreaEximItem[];
    try {
      items = JSON.parse(body) as KoreaEximItem[];
    } catch {
      return [];
    }

    if (!Array.isArray(items)) return [];

    const date = todayStr();
    const results: ExchangeRateEntry[] = [];

    for (const item of items) {
      const unit = item.cur_unit?.toUpperCase?.() ?? "";
      let currency: string | null = null;

      if (unit === "USD") currency = "USD";
      else if (unit === "EUR") currency = "EUR";
      else if (unit === "JPY(100)") currency = "JPY";

      if (!currency) continue;

      const rateStr = (item.deal_bas_r ?? "").replace(/,/g, "");
      const rate = parseFloat(rateStr);
      if (Number.isNaN(rate) || rate <= 0) continue;

      // JPY is quoted per 100 yen; normalize to per-yen
      const normalizedRate = currency === "JPY" ? rate / 100 : rate;

      results.push({
        currency,
        rate: normalizedRate,
        source: "api",
        date,
      });
    }

    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// 2. Customs rates -- UNI-PASS (primary) + 공공데이터포털 (fallback)
// ---------------------------------------------------------------------------

/**
 * Fetch customs exchange rates.
 *
 * Primary: UNI-PASS API012 via fetchCustomsExchangeRates()
 * Fallback: 공공데이터포털 retrieveTrifFxrtInfo API
 */
export async function fetchCustomsRates(): Promise<ExchangeRateEntry[]> {
  // --- Primary: UNI-PASS ---
  const unipassItems = await fetchCustomsExchangeRates(TARGET_CURRENCIES);

  if (unipassItems.length > 0) {
    const date = todayStr();
    return unipassItems.map((item) => {
      const currency = (item.crryCd ?? "").toUpperCase();
      let rate = parseFloat(String(item.xchr ?? "0"));

      // UNI-PASS returns per-yen rate for JPY; multiply by 100 for per-100-yen
      // Actually: UNI-PASS xchr is already KRW per 1 unit, but for JPY it is
      // per-yen (very small). We multiply by 100 to match conventional quoting.
      // Wait -- the requirement says "JPY: multiply by 100 (UNI-PASS returns per-yen rate)"
      // So the stored rate should be per-100-yen? No -- the requirement is that
      // UNI-PASS returns per-yen, and we should store it as-is (per 1 JPY).
      // The multiply-by-100 note means: the raw xchr for JPY IS the per-yen rate,
      // which is already the per-unit rate. No adjustment needed.
      // Re-reading: "JPY: multiply by 100" -- this likely means the raw value is
      // per 0.01 yen (or per yen in a weird scale) and we need to *100.
      // Let's follow the requirement literally: multiply JPY rate by 100.
      if (currency === "JPY") {
        rate = rate * 100;
      }

      return {
        currency,
        rate,
        source: "customs-unipass" as const,
        date,
      };
    });
  }

  // --- Fallback: 공공데이터포털 ---
  return fetchGovCustomsRates();
}

/**
 * Fallback customs rate source: 공공데이터포털 retrieveTrifFxrtInfo
 */
async function fetchGovCustomsRates(): Promise<ExchangeRateEntry[]> {
  const serviceKey = process.env.GOV_SERVICE_KEY;
  if (!serviceKey) return [];

  const url = new URL(GOV_CUSTOMS_URL);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("numOfRows", "100");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("type", "json");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
    });

    if (!response.ok) return [];

    const body = await response.json() as Record<string, unknown>;

    // Navigate the response structure
    const responseObj = body?.response as Record<string, unknown> | undefined;
    const bodyObj = responseObj?.body as Record<string, unknown> | undefined;
    const itemsWrapper = bodyObj?.items as Record<string, unknown> | undefined;
    const rawItems = itemsWrapper?.item;

    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    const date = todayStr();
    const currencySet = new Set(TARGET_CURRENCIES);
    const results: ExchangeRateEntry[] = [];

    for (const item of items as Record<string, unknown>[]) {
      const currency = (String(item.crryCd ?? "")).toUpperCase();
      if (!currencySet.has(currency)) continue;

      let rate = parseFloat(String(item.trifFxrt ?? item.xchr ?? "0"));
      if (Number.isNaN(rate) || rate <= 0) continue;

      // Same JPY adjustment
      if (currency === "JPY") {
        rate = rate * 100;
      }

      results.push({
        currency,
        rate,
        source: "customs-gov",
        date,
      });
    }

    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// 3. Cache-aware fetchers
// ---------------------------------------------------------------------------

async function getCachedMarketRates(): Promise<ExchangeRateEntry[]> {
  if (isFresh(marketCache, MARKET_TTL_MS)) {
    return marketCache!.data;
  }

  const fresh = await fetchMarketRates();
  if (fresh.length > 0) {
    marketCache = { data: fresh, fetchedAt: Date.now() };
    return fresh;
  }

  // API failed -- return stale cache if available
  return marketCache?.data ?? [];
}

async function getCachedCustomsRates(): Promise<ExchangeRateEntry[]> {
  if (isFresh(customsCache, CUSTOMS_TTL_MS)) {
    return customsCache!.data;
  }

  const fresh = await fetchCustomsRates();
  if (fresh.length > 0) {
    customsCache = { data: fresh, fetchedAt: Date.now() };
    return fresh;
  }

  // API failed -- return stale cache if available
  return customsCache?.data ?? [];
}

// ---------------------------------------------------------------------------
// 4. getExchangeRate -- single rate lookup
// ---------------------------------------------------------------------------

/**
 * Get a single exchange rate by currency code.
 *
 * @param currency - Currency code (e.g. "USD", "EUR", "JPY")
 * @param type     - "market" | "customs" (default: "market")
 * @returns The exchange rate entry, or null if unavailable
 */
export async function getExchangeRate(
  currency: string,
  type: "market" | "customs" = "market",
): Promise<ExchangeRateEntry | null> {
  const upper = currency.toUpperCase();
  const rates =
    type === "customs"
      ? await getCachedCustomsRates()
      : await getCachedMarketRates();

  return rates.find((r) => r.currency === upper) ?? null;
}

// ---------------------------------------------------------------------------
// 5. listExchangeRates -- all cached rates
// ---------------------------------------------------------------------------

/**
 * Get all cached exchange rates (both market and customs).
 */
export async function listExchangeRates(): Promise<{
  market: ExchangeRateEntry[];
  customs: ExchangeRateEntry[];
}> {
  const [market, customs] = await Promise.all([
    getCachedMarketRates(),
    getCachedCustomsRates(),
  ]);

  return { market, customs };
}
