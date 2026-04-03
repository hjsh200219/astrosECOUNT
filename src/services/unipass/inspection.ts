/**
 * UNI-PASS API004 - Inspection Results (검사/검역 결과 조회)
 */

import { fetchUnipassApi } from "./client.js";
import type { InspectionItem } from "./types.js";

/**
 * Get inspection/quarantine results for a B/L number.
 *
 * @param blNumber - Master B/L number
 * @returns Array of inspection items (empty on error)
 */
export async function getInspectionResults(
  blNumber: string,
): Promise<InspectionItem[]> {
  try {
    const response = await fetchUnipassApi<InspectionItem>({
      path: "/cargCsclPrgsInfoQry",
      apiId: "004",
      params: { mblNo: blNumber },
      rootElement: "cargCsclPrgsInfoQryRtnVo",
      itemElement: "cargCsclPrgsInfoQryVo",
    });
    return response.items;
  } catch {
    return [];
  }
}
