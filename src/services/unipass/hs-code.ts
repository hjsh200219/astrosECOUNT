/**
 * UNI-PASS API018 - HS Code Search (품목분류 조회)
 */

import { fetchUnipassApi } from "./client.js";
import type { HsCodeSearchItem } from "./types.js";

/**
 * Search HS codes by code prefix or full code.
 *
 * @param hsCode - HS code to search
 * @returns Array of matching HS code items (empty on error)
 */
export async function searchHsCode(
  hsCode: string,
): Promise<HsCodeSearchItem[]> {
  try {
    const response = await fetchUnipassApi<HsCodeSearchItem>({
      path: "/crifTarifFetchInfoQry",
      apiId: "018",
      params: { hsSgn: hsCode },
      rootElement: "crifTarifFetchInfoQryRtnVo",
      itemElement: "crifTarifFetchInfoQryVo",
    });
    return response.items;
  } catch {
    return [];
  }
}
