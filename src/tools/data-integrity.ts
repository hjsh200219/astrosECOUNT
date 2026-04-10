import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface CheckResult {
  name: string;
  passed: boolean;
  severity: "error" | "warning" | "info";
  details: string[];
}

export interface IntegrityReport {
  checks: CheckResult[];
  passCount: number;
  failCount: number;
  overallPassed: boolean;
  checkedAt: string;
}

export interface ContractRecord {
  id: string;
  blNumber?: string;
  product: string;
}

export interface ShipmentRecord {
  id: string;
  blNumber: string;
  product: string;
  status: string;
}

export interface InventoryBalance {
  product: string;
  quantity: number;
  period: string;
}

export interface CostRecord {
  shipmentId: string;
  customsCost: number;
  additionalCosts?: number;
}

const CUSTOMS_CLEARED_STATUS = "통관완료";

export function validateContractShipmentMatch(
  contracts: ContractRecord[],
  shipments: ShipmentRecord[]
): CheckResult {
  const details: string[] = [];

  // Build sets of blNumbers
  const contractBls = new Set(
    contracts.filter((c) => c.blNumber).map((c) => c.blNumber as string)
  );
  const shipmentBls = new Set(shipments.map((s) => s.blNumber));

  // Contracts without a matching shipment
  for (const bl of contractBls) {
    if (!shipmentBls.has(bl)) {
      details.push(`계약 BL번호 ${bl}에 해당하는 선적 데이터가 없습니다.`);
    }
  }

  // Shipments without a matching contract
  for (const bl of shipmentBls) {
    if (!contractBls.has(bl)) {
      details.push(`선적 BL번호 ${bl}에 해당하는 계약 데이터가 없습니다.`);
    }
  }

  const passed = details.length === 0;
  return {
    name: "contract-shipment-match",
    passed,
    severity: passed ? "info" : "error",
    details,
  };
}

export function validateInventoryConsistency(
  openingInventory: InventoryBalance[],
  priorClosing: InventoryBalance[]
): CheckResult {
  const details: string[] = [];
  let hasError = false;
  let hasWarning = false;

  const priorMap = new Map<string, number>(
    priorClosing.map((b) => [b.product, b.quantity])
  );

  for (const opening of openingInventory) {
    if (!priorMap.has(opening.product)) {
      details.push(
        `품목 '${opening.product}'이 이전 기간 마감 재고에 없습니다. 신규 품목이거나 데이터 누락일 수 있습니다.`
      );
      hasWarning = true;
    } else {
      const priorQty = priorMap.get(opening.product) as number;
      if (opening.quantity !== priorQty) {
        details.push(
          `품목 '${opening.product}'의 기초재고(${opening.quantity})가 전기 마감재고(${priorQty})와 일치하지 않습니다.`
        );
        hasError = true;
      }
    }
  }

  const passed = details.length === 0;
  const severity: "error" | "warning" | "info" = hasError
    ? "error"
    : hasWarning
    ? "warning"
    : "info";

  return {
    name: "inventory-consistency",
    passed,
    severity,
    details,
  };
}

export function validateCustomsCostGap(
  shipments: ShipmentRecord[],
  costRecords: CostRecord[]
): CheckResult {
  const details: string[] = [];

  const costSet = new Set(costRecords.map((c) => c.shipmentId));

  for (const shipment of shipments) {
    if (shipment.status === CUSTOMS_CLEARED_STATUS && !costSet.has(shipment.id)) {
      details.push(
        `선적 ${shipment.id} (BL: ${shipment.blNumber})은 통관완료 상태이나 원가 기록이 없습니다.`
      );
    }
  }

  const passed = details.length === 0;
  return {
    name: "customs-cost-gap",
    passed,
    severity: passed ? "info" : "error",
    details,
  };
}

export interface ValidateAllInput {
  contracts: ContractRecord[];
  shipments: ShipmentRecord[];
  openingInventory?: InventoryBalance[];
  priorClosing?: InventoryBalance[];
  costRecords?: CostRecord[];
}

export function validateAll(input: ValidateAllInput): IntegrityReport {
  const {
    contracts,
    shipments,
    openingInventory = [],
    priorClosing = [],
    costRecords = [],
  } = input;

  const checks: CheckResult[] = [
    validateContractShipmentMatch(contracts, shipments),
    validateInventoryConsistency(openingInventory, priorClosing),
    validateCustomsCostGap(shipments, costRecords),
  ];

  const passCount = checks.filter((c) => c.passed).length;
  const failCount = checks.filter((c) => !c.passed).length;

  return {
    checks,
    passCount,
    failCount,
    overallPassed: failCount === 0,
    checkedAt: new Date().toISOString(),
  };
}

export function registerDataIntegrityTools(server: McpServer): void {
  server.tool(
    "ecount_validate_data_integrity",
    "계약↔선적 매칭, 기초재고 vs 전기 마감재고, 통관완료 원가 누락 등 L2 데이터 정합성을 검증합니다.",
    {
      contracts: z
        .array(
          z.object({
            id: z.string().describe("계약 ID"),
            blNumber: z.string().optional().describe("BL 번호"),
            product: z.string().describe("품목명"),
          })
        )
        .describe("계약 레코드 목록"),
      shipments: z
        .array(
          z.object({
            id: z.string().describe("선적 ID"),
            blNumber: z.string().describe("BL 번호"),
            product: z.string().describe("품목명"),
            status: z.string().describe("선적 상태"),
          })
        )
        .describe("선적 레코드 목록"),
      openingInventory: z
        .array(
          z.object({
            product: z.string().describe("품목명"),
            quantity: z.number().describe("기초재고 수량"),
            period: z.string().describe("기간 (예: 2024-02)"),
          })
        )
        .optional()
        .describe("기초재고 목록"),
      priorClosing: z
        .array(
          z.object({
            product: z.string().describe("품목명"),
            quantity: z.number().describe("마감재고 수량"),
            period: z.string().describe("기간 (예: 2024-01)"),
          })
        )
        .optional()
        .describe("전기 마감재고 목록"),
      costRecords: z
        .array(
          z.object({
            shipmentId: z.string().describe("선적 ID"),
            customsCost: z.number().describe("관세 비용"),
            additionalCosts: z.number().optional().describe("기타 추가 비용"),
          })
        )
        .optional()
        .describe("원가 기록 목록"),
    },
    { readOnlyHint: true },
    handleValidateDataIntegrity,
  );
}

async function handleValidateDataIntegrity(params: Record<string, unknown>) {
  try {
    const report = validateAll({
      contracts: (params.contracts ?? []) as ContractRecord[],
      shipments: (params.shipments ?? []) as ShipmentRecord[],
      openingInventory: (params.openingInventory ?? []) as InventoryBalance[],
      priorClosing: (params.priorClosing ?? []) as InventoryBalance[],
      costRecords: (params.costRecords ?? []) as CostRecord[],
    });
    return formatResponse(report);
  } catch (error) {
    return handleToolError(error);
  }
}
