/**
 * UNI-PASS API010, API013 - Directory Search (업체/관세사 조회)
 */

import { fetchUnipassApi } from "./client.js";
import type { CustomsCodeItem, CustomsBrokerItem } from "./types.js";

/**
 * API010 - Search customs code / company by trade name.
 *
 * @param query - Company/trade name to search
 * @returns Array of customs code items (empty on error)
 */
export async function searchCompany(
  query: string,
): Promise<CustomsCodeItem[]> {
  try {
    const response = await fetchUnipassApi<CustomsCodeItem>({
      path: "/cargCsclPrgsInfoDtlQry",
      apiId: "010",
      params: { trdnNm: query },
      rootElement: "trdnCstmCdInfoQryRtnVo",
      itemElement: "trdnCstmCdInfoQryVo",
    });
    return response.items;
  } catch {
    return [];
  }
}

/**
 * API013 - Search customs broker by name.
 *
 * @param query - Customs broker name to search
 * @returns Array of customs broker items (empty on error)
 */
export async function searchBroker(
  query: string,
): Promise<CustomsBrokerItem[]> {
  try {
    const response = await fetchUnipassApi<CustomsBrokerItem>({
      path: "/cbrkBsNoInfoQry",
      apiId: "013",
      params: { cbrkNm: query },
      rootElement: "cbrkBsNoInfoQryRtnVo",
      itemElement: "cbrkBsNoInfoQryVo",
    });
    return response.items;
  } catch {
    return [];
  }
}
