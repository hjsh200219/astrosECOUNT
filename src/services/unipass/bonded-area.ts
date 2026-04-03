/**
 * UNI-PASS API047 - Bonded Area Storage Period (보세구역 장치기간 조회)
 */

import { fetchUnipassApi } from "./client.js";
import type { BondedAreaPeriodItem } from "./types.js";

/**
 * Get bonded area storage period information.
 *
 * @param cargoManagementNo - Cargo management number (화물관리번호)
 * @returns Array of bonded area period items (empty on error)
 */
export async function getBondedAreaPeriod(
  cargoManagementNo: string,
): Promise<BondedAreaPeriodItem[]> {
  try {
    const response = await fetchUnipassApi<BondedAreaPeriodItem>({
      path: "/bndAreaStrgPridQry",
      apiId: "047",
      params: { cargMtNo: cargoManagementNo },
      rootElement: "bndAreaStrgPridQryRtnVo",
      itemElement: "bndAreaStrgPridQryVo",
    });
    return response.items;
  } catch {
    return [];
  }
}
