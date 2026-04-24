import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface BusinessRule {
  id: string;
  category: "customs" | "warehouse" | "logistics" | "general";
  name: string;
  description: string;
  condition: string;
  action: string;
}

interface BrokerAssignment {
  broker: string;
  contact: string;
  reason: string;
}

interface WarehouseStage {
  stage: string;
  warehouses: { code: string; name: string }[];
}

interface WarehouseMapping {
  stages: WarehouseStage[];
}

// 관세법인 배정 규칙
const CUSTOMS_BROKER_RULES: {
  pattern: string;
  broker: string;
  contact: string;
}[] = [
  {
    pattern: "전지벌크",
    broker: "원스탑관세법인",
    contact: "강동훈 관세사",
  },
];

const DEFAULT_BROKER = {
  broker: "정운관세법인",
  contact: "박태호 관세사",
};

// 3단계 창고 매핑 (ECOUNT 기준)
const WAREHOUSE_STAGES: WarehouseStage[] = [
  {
    stage: "미착",
    warehouses: [
      { code: "2x", name: "미착창고" },
    ],
  },
  {
    stage: "미통관",
    warehouses: [
      { code: "3x", name: "미통관창고" },
    ],
  },
  {
    stage: "상품",
    warehouses: [
      { code: "4x", name: "상품창고" },
    ],
  },
];

// 비즈니스 룰 정의
const BUSINESS_RULES: BusinessRule[] = [
  {
    id: "RULE-CUSTOMS-01",
    category: "customs",
    name: "관세법인 배정 규칙",
    description: "품목 유형에 따라 관세법인을 자동 배정",
    condition: "품목명에 '전지벌크' 포함",
    action: "원스탑관세법인 배정 (강동훈 관세사)",
  },
  {
    id: "RULE-CUSTOMS-02",
    category: "customs",
    name: "기본 관세법인 배정",
    description: "전지벌크 외 모든 품목의 기본 관세법인",
    condition: "전지벌크 외 모든 품목",
    action: "정운관세법인 배정 (박태호 관세사)",
  },
  {
    id: "RULE-WH-01",
    category: "warehouse",
    name: "3단계 재고 파이프라인",
    description: "수입육의 3단계 재고 관리 체계",
    condition: "수입 프로세스 단계 변경 시",
    action: "미착(2x) → 미통관(3x) → 상품(4x) 창고 이동",
  },
  {
    id: "RULE-LOG-01",
    category: "logistics",
    name: "서류 전달 규칙",
    description: "선적서류 수신 시 관련 업체에 동시 전달",
    condition: "선적서류(BL, Invoice, Packing List) 수신",
    action: "삼현INT + 정운관세법인(또는 원스탑)에 동시 전달",
  },
];

export function getCustomsBroker(productName: string): BrokerAssignment {
  for (const rule of CUSTOMS_BROKER_RULES) {
    if (productName.includes(rule.pattern)) {
      return {
        broker: rule.broker,
        contact: rule.contact,
        reason: `품목명 '${productName}'에 '${rule.pattern}' 포함 → ${rule.broker} 배정`,
      };
    }
  }

  return {
    broker: DEFAULT_BROKER.broker,
    contact: DEFAULT_BROKER.contact,
    reason: `기본 관세법인 배정 → ${DEFAULT_BROKER.broker}`,
  };
}

export function getWarehouseMapping(): WarehouseMapping {
  return { stages: WAREHOUSE_STAGES };
}

export function listBusinessRules(category?: string): BusinessRule[] {
  if (!category) return [...BUSINESS_RULES];
  return BUSINESS_RULES.filter((r) => r.category === category);
}

async function handleGetCustomsBroker(params: Record<string, unknown>) {
  try {
    return formatResponse(getCustomsBroker(params.product_name as string));
  } catch (error) {
    return handleToolError(error);
  }
}

async function handleGetWarehouseMapping() {
  try {
    return formatResponse(getWarehouseMapping());
  } catch (error) {
    return handleToolError(error);
  }
}

async function handleListBusinessRules(params: Record<string, unknown>) {
  try {
    const rules = listBusinessRules(params.category as string | undefined);
    return formatResponse({ count: rules.length, rules });
  } catch (error) {
    return handleToolError(error);
  }
}

export function registerBusinessRuleTools(server: McpServer): void {
  server.tool(
    "ecount_rule_get_customs_broker",
    "품목명을 입력하면 해당 품목의 관세법인 배정 결과를 반환합니다. 전지벌크→원스탑, 그 외→정운 규칙을 적용합니다.",
    { product_name: z.string().describe("품목명 (예: 전지벌크, 돈육 목살)") },
    { readOnlyHint: true },
    handleGetCustomsBroker,
  );

  server.tool(
    "ecount_rule_get_warehouse_mapping",
    "수입육 3단계 재고 파이프라인(미착→미통관→상품)의 창고 매핑 정보를 반환합니다.",
    {},
    { readOnlyHint: true },
    handleGetWarehouseMapping,
  );

  server.tool(
    "ecount_rule_list_business_rules",
    "수입육 업무 비즈니스 룰 목록을 조회합니다. 카테고리(customs/warehouse/logistics/general)로 필터링 가능합니다.",
    { category: z.enum(["customs", "warehouse", "logistics", "general"]).optional() },
    { readOnlyHint: true },
    handleListBusinessRules,
  );
}
