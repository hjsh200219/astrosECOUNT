/**
 * UNI-PASS API049 - Tax Payment Status (세금납부 현황 조회)
 */

import { fetchUnipassApi } from "./client.js";
import type { TaxPaymentItem } from "./types.js";

/**
 * Get tax payment notification status for a declaration.
 *
 * @param declarationNo - Declaration number (신고번호)
 * @returns Array of tax payment items (empty on error)
 */
export async function getTaxPaymentStatus(
  declarationNo: string,
): Promise<TaxPaymentItem[]> {
  try {
    const response = await fetchUnipassApi<TaxPaymentItem>({
      path: "/imptTxpymNtceInfoQry",
      apiId: "049",
      params: { dclrNo: declarationNo },
      rootElement: "imptTxpymNtceInfoQryRtnVo",
      itemElement: "imptTxpymNtceInfoQryVo",
    });
    return response.items;
  } catch {
    return [];
  }
}
