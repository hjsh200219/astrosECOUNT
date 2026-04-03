/**
 * UNI-PASS API022 - Import Declaration Verification (수입신고 검증)
 */

import { fetchUnipassApi } from "./client.js";
import type { ImportDeclarationItem } from "./types.js";

/**
 * Verify an import declaration by declaration number.
 *
 * Tries the primary root/item element names first, then falls back
 * to alternative names if no items are found.
 *
 * @param declarationNo - Declaration number (신고번호)
 * @returns First matching declaration item, or null if not found / on error
 */
export async function verifyImportDeclaration(
  declarationNo: string,
): Promise<ImportDeclarationItem | null> {
  try {
    const response = await fetchUnipassApi<ImportDeclarationItem>({
      path: "/cargCsclPrgsInfoDtlQry",
      apiId: "022",
      params: { dclrNo: declarationNo },
      rootElement: "imptDclrNoPrgsInfoDtlQryRtnVo",
      itemElement: "imptDclrNoPrgsInfoDtlQryVo",
    });

    if (response.items.length > 0) {
      return response.items[0] ?? null;
    }

    // Fallback root/item element names
    const fallback = await fetchUnipassApi<ImportDeclarationItem>({
      path: "/cargCsclPrgsInfoDtlQry",
      apiId: "022",
      params: { dclrNo: declarationNo },
      rootElement: "cargCsclPrgsInfoDtlQryRtnVo",
      itemElement: "cargCsclPrgsInfoDtlQryVo",
    });

    return fallback.items[0] ?? null;
  } catch {
    return null;
  }
}
