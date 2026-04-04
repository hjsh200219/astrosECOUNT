import { generateId } from "./id-generator.js";
import { nowIso } from "./date-helpers.js";

export const STAGES = ["계약", "미착", "도착", "상품", "판매완료"] as const;
export type Stage = (typeof STAGES)[number];

export interface InventoryTransition {
  id: string;
  shipmentId: string;
  product: string;
  fromStage: Stage;
  toStage: Stage;
  quantity: number;
  warehouse?: string;
  timestamp: string;
}

export const transitions = new Map<string, InventoryTransition>();

function validateTransition(fromStage: Stage, toStage: Stage): void {
  const fromIdx = STAGES.indexOf(fromStage);
  const toIdx = STAGES.indexOf(toStage);
  if (fromIdx === -1 || toIdx === -1) {
    throw new Error(`유효하지 않은 단계입니다: ${fromStage} → ${toStage}`);
  }
  if (toIdx - fromIdx !== 1) {
    throw new Error(
      `단계 전환은 순차적이어야 합니다. ${fromStage}(${fromIdx}) → ${toStage}(${toIdx})는 허용되지 않습니다. 유효한 전환: ${STAGES.slice(0, -1).map((s, i) => `${s}→${STAGES[i + 1]}`).join(", ")}`,
    );
  }
}

export function addTransition(params: Omit<InventoryTransition, "id" | "timestamp">): InventoryTransition {
  validateTransition(params.fromStage, params.toStage);
  const transition: InventoryTransition = {
    ...params,
    id: generateId("it"),
    timestamp: nowIso(),
  };
  transitions.set(transition.id, transition);
  return transition;
}
