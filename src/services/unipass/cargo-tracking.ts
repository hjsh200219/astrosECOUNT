/**
 * UNI-PASS API001, API020, API021 - Cargo Tracking / Container / Arrival Report
 */

import { fetchUnipassApi } from "./client.js";
import type {
  CargoTrackingItem,
  ContainerItem,
  ArrivalReportItem,
} from "./types.js";

/**
 * API001 - Get cargo customs clearance progress info.
 *
 * @param blNumber - Master B/L number
 * @returns Array of cargo tracking items (empty on error)
 */
export async function getCargoTracking(
  blNumber: string,
): Promise<CargoTrackingItem[]> {
  try {
    const response = await fetchUnipassApi<CargoTrackingItem>({
      path: "/cargCsclPrgsInfoQry",
      apiId: "001",
      params: { mblNo: blNumber },
      rootElement: "cargCsclPrgsInfoQryRtnVo",
      itemElement: "cargCsclPrgsInfoQryVo",
    });
    return response.items;
  } catch {
    return [];
  }
}

/**
 * API020 - Get container information for a B/L.
 *
 * @param blNumber - Master B/L number
 * @returns Array of container items (empty on error)
 */
export async function getContainerInfo(
  blNumber: string,
): Promise<ContainerItem[]> {
  try {
    const response = await fetchUnipassApi<ContainerItem>({
      path: "/cargCntrInfoQry",
      apiId: "020",
      params: { mblNo: blNumber },
      rootElement: "cargCntrInfoQryRtnVo",
      itemElement: "cargCntrInfoQryVo",
    });
    return response.items;
  } catch {
    return [];
  }
}

/**
 * API021 - Get arrival/entry report details.
 *
 * @param blNumber - Master B/L number
 * @returns Array of arrival report items (empty on error)
 */
export async function getArrivalReport(
  blNumber: string,
): Promise<ArrivalReportItem[]> {
  try {
    const response = await fetchUnipassApi<ArrivalReportItem>({
      path: "/cargCsclPrgsInfoDtlQry",
      apiId: "021",
      params: { mblNo: blNumber },
      rootElement: "etprRprtInfoDtlQryRtnVo",
      itemElement: "etprRprtInfoDtlQryVo",
    });
    return response.items;
  } catch {
    return [];
  }
}
