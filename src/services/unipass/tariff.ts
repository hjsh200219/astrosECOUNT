/**
 * UNI-PASS API030 - Tariff Rate (세율 조회)
 */

import { fetchUnipassApi } from "./client.js";
import type { TariffRateItem } from "./types.js";

/**
 * Get tariff rate information for a specific HS code.
 *
 * @param hsCode - HS code to look up
 * @returns First matching tariff rate item, or null if not found / on error
 */
export async function getTariffRate(
  hsCode: string,
): Promise<TariffRateItem | null> {
  try {
    const response = await fetchUnipassApi<TariffRateItem>({
      path: "/crifTarifRtInfoQry",
      apiId: "030",
      params: { hsSgn: hsCode },
      rootElement: "crifTarifRtInfoQryRtnVo",
      itemElement: "crifTarifRtInfoQryVo",
    });
    return response.items[0] ?? null;
  } catch {
    return null;
  }
}
