/**
 * UNI-PASS API012 - Customs Exchange Rate (관세환율 조회)
 */

import { fetchUnipassApi, normalizeItems } from "./client.js";
import type { CustomsExchangeRateItem } from "./types.js";

const DEFAULT_CURRENCIES = ["USD", "EUR", "JPY"];

/**
 * Fetch customs exchange rates, optionally filtered by currency codes.
 *
 * @param currencies - Currency codes to filter (default: USD, EUR, JPY)
 * @returns Array of exchange rate items (empty on error)
 */
export async function fetchCustomsExchangeRates(
  currencies: string[] = DEFAULT_CURRENCIES,
): Promise<CustomsExchangeRateItem[]> {
  try {
    const response = await fetchUnipassApi<CustomsExchangeRateItem>({
      path: "/trifFxrtInfoQry",
      apiId: "012",
      rootElement: "trifFxrtInfoQryRtnVo",
      itemElement: "trifFxrtInfoQryVo",
    });

    // Fallback: if items are empty, try alternative VO casing
    let items = response.items;
    if (items.length === 0) {
      const fallback = await fetchUnipassApi<CustomsExchangeRateItem>({
        path: "/trifFxrtInfoQry",
        apiId: "012",
        rootElement: "trifFxrtInfoQryRtnVO",
        itemElement: "trifFxrtInfoQryVO",
      });
      items = fallback.items;
    }

    // Post-fetch filter by currency
    if (currencies.length > 0) {
      const currencySet = new Set(currencies.map((c) => c.toUpperCase()));
      items = items.filter(
        (item) => currencySet.has(item.crryCd?.toUpperCase?.() ?? ""),
      );
    }

    return items;
  } catch {
    return [];
  }
}
