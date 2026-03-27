import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface InventoryStage {
  stage: string;
  product: string;
  quantity: number;
  warehouse?: string;
}

export interface Discrepancy {
  product: string;
  issue: string;
  detail: string;
}

export interface VerificationResult {
  totalQuantity: number;
  byStage: Record<string, number>;
  discrepancies: Discrepancy[];
  isConsistent: boolean;
}

export interface ContractEntry {
  contractId: string;
  blNumber?: string;
  product: string;
  quantity: number;
}

export interface ShipmentEntry {
  shipmentId: string;
  blNumber: string;
  product: string;
  quantity: number;
  status: string;
}

export interface CrossValidationResult {
  unmatchedContracts: { contractId: string; product: string; reason: string }[];
  unmatchedShipments: { shipmentId: string; blNumber: string; reason: string }[];
  quantityMismatches: { blNumber: string; contractQty: number; shipmentQty: number; diff: number }[];
  isConsistent: boolean;
}

const PRIOR_STAGES = ["미착", "미통관"];

export function verifyInventory(stages: InventoryStage[]): VerificationResult {
  const byStage: Record<string, number> = {};
  const discrepancies: Discrepancy[] = [];

  // Aggregate quantity by stage
  for (const entry of stages) {
    byStage[entry.stage] = (byStage[entry.stage] ?? 0) + entry.quantity;
  }

  const totalQuantity = Object.values(byStage).reduce((sum, q) => sum + q, 0);

  // Collect product sets per stage
  const productsByStage: Record<string, Set<string>> = {};
  for (const entry of stages) {
    if (!productsByStage[entry.stage]) {
      productsByStage[entry.stage] = new Set();
    }
    productsByStage[entry.stage].add(entry.product);
  }

  // Check each entry for issues
  const checkedProducts = new Set<string>();
  for (const entry of stages) {
    // Flag negative or zero quantity
    if (entry.quantity <= 0) {
      const issueType = entry.quantity < 0 ? "음수 수량" : "0 수량";
      discrepancies.push({
        product: entry.product,
        issue: `${issueType} 감지`,
        detail: `단계 '${entry.stage}'의 품목 '${entry.product}' 수량이 ${entry.quantity}입니다.`,
      });
    }

    // Flag product in 상품 stage without prior stage presence
    if (entry.stage === "상품" && !checkedProducts.has(entry.product)) {
      checkedProducts.add(entry.product);
      const existsInPrior = PRIOR_STAGES.some(
        (s) => productsByStage[s]?.has(entry.product)
      );
      if (!existsInPrior) {
        discrepancies.push({
          product: entry.product,
          issue: "이전 단계 누락",
          detail: `품목 '${entry.product}'이 '상품' 단계에만 존재하고 이전 단계(미착/미통관)에 없습니다. 데이터 입력 오류일 수 있습니다.`,
        });
      }
    }
  }

  return {
    totalQuantity,
    byStage,
    discrepancies,
    isConsistent: discrepancies.length === 0,
  };
}

export function validateContractShipmentCross(
  contracts: ContractEntry[],
  shipments: ShipmentEntry[]
): CrossValidationResult {
  const unmatchedContracts: CrossValidationResult["unmatchedContracts"] = [];
  const unmatchedShipments: CrossValidationResult["unmatchedShipments"] = [];
  const quantityMismatches: CrossValidationResult["quantityMismatches"] = [];

  // Build a map of shipments by blNumber
  const shipmentByBl = new Map<string, ShipmentEntry>();
  for (const shipment of shipments) {
    shipmentByBl.set(shipment.blNumber, shipment);
  }

  // Track which BL numbers were matched by a contract
  const matchedBlNumbers = new Set<string>();

  for (const contract of contracts) {
    if (!contract.blNumber) {
      unmatchedContracts.push({
        contractId: contract.contractId,
        product: contract.product,
        reason: "BL번호 미지정",
      });
      continue;
    }

    const shipment = shipmentByBl.get(contract.blNumber);
    if (!shipment) {
      unmatchedContracts.push({
        contractId: contract.contractId,
        product: contract.product,
        reason: "선적 데이터 없음",
      });
      continue;
    }

    matchedBlNumbers.add(contract.blNumber);

    if (contract.quantity !== shipment.quantity) {
      quantityMismatches.push({
        blNumber: contract.blNumber,
        contractQty: contract.quantity,
        shipmentQty: shipment.quantity,
        diff: Math.abs(contract.quantity - shipment.quantity),
      });
    }
  }

  // Shipments whose BL was not referenced by any contract
  for (const shipment of shipments) {
    if (!matchedBlNumbers.has(shipment.blNumber)) {
      unmatchedShipments.push({
        shipmentId: shipment.shipmentId,
        blNumber: shipment.blNumber,
        reason: "계약 데이터 없음",
      });
    }
  }

  return {
    unmatchedContracts,
    unmatchedShipments,
    quantityMismatches,
    isConsistent:
      unmatchedContracts.length === 0 &&
      unmatchedShipments.length === 0 &&
      quantityMismatches.length === 0,
  };
}

export function registerInventoryVerifyTools(server: McpServer): void {
  server.tool(
    "ecount_verify_inventory",
    "재고 3단계(미착/미통관/상품) 데이터의 정합성을 교차 검증합니다.",
    {
      stages: z
        .array(
          z.object({
            stage: z.string().describe("재고 단계 (미착/미통관/상품)"),
            product: z.string().describe("품목명"),
            quantity: z.number().describe("수량"),
            warehouse: z.string().optional().describe("창고코드"),
          })
        )
        .describe("검증할 재고 단계 데이터 목록"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const stages = params.stages as InventoryStage[];
        const result = verifyInventory(stages);
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.tool(
    "ecount_validate_contract_shipment",
    "계약 데이터와 선적(BL) 데이터를 교차 검증하여 미매칭 및 수량 불일치를 탐지합니다.",
    {
      contracts: z
        .array(
          z.object({
            contractId: z.string().describe("계약 ID"),
            blNumber: z.string().optional().describe("BL 번호"),
            product: z.string().describe("품목명"),
            quantity: z.number().describe("계약 수량"),
          })
        )
        .describe("교차 검증할 계약 데이터 목록"),
      shipments: z
        .array(
          z.object({
            shipmentId: z.string().describe("선적 ID"),
            blNumber: z.string().describe("BL 번호"),
            product: z.string().describe("품목명"),
            quantity: z.number().describe("선적 수량"),
            status: z.string().describe("선적 상태"),
          })
        )
        .describe("교차 검증할 선적 데이터 목록"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
      try {
        const contracts = params.contracts as ContractEntry[];
        const shipments = params.shipments as ShipmentEntry[];
        const result = validateContractShipmentCross(contracts, shipments);
        return formatResponse(result);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
