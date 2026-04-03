/**
 * UNI-PASS API033 - Animal/Plant Quarantine Company (동식물검역 업체 조회)
 */

import { fetchUnipassApi } from "./client.js";
import type { AnimalPlantCompanyItem } from "./types.js";

/**
 * Get animal/plant quarantine company information.
 *
 * @param companyName - Company name to search (업체명)
 * @returns Array of animal/plant company items (empty on error)
 */
export async function getAnimalPlantCompany(
  companyName: string,
): Promise<AnimalPlantCompanyItem[]> {
  try {
    const response = await fetchUnipassApi<AnimalPlantCompanyItem>({
      path: "/animalPlantCompanyInfoQry",
      apiId: "033",
      params: { bsntNm: companyName },
      rootElement: "animalPlantCompanyInfoQryRtnVo",
      itemElement: "animalPlantCompanyInfoQryVo",
    });
    return response.items;
  } catch {
    return [];
  }
}
