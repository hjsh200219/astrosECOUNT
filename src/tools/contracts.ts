import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";
import {
  type Contract,
  addContract,
  getContract,
  listContracts,
  updateContractStatus,
} from "../utils/contract-store.js";

export type { Contract };
export { addContract, getContract, listContracts, updateContractStatus };

const CONTRACT_STATUS = ["draft", "signed", "active", "completed", "cancelled"] as const;

async function handleAddContract(params: Record<string, unknown>) {
  try {
    const contract = addContract({
      contractNumber: params.contractNumber as string,
      supplier: params.supplier as string,
      buyer: params.buyer as string,
      product: params.product as string,
      quantity: params.quantity as number,
      unitPrice: params.unitPrice as number,
      currency: params.currency as string,
      incoterms: params.incoterms as string,
      signedDate: params.signedDate as string | undefined,
      expiryDate: params.expiryDate as string | undefined,
      status: params.status as Contract["status"],
      notes: params.notes as string | undefined,
    });
    return formatResponse({ success: true, contract });
  } catch (error) {
    return handleToolError(error);
  }
}

async function handleGetContract(params: Record<string, unknown>) {
  try {
    const result = getContract(params.id as string);
    if (!result) {
      return formatResponse({ found: false, message: `계약 ID '${params.id}'를 찾을 수 없습니다.` });
    }
    return formatResponse({ found: true, contract: result });
  } catch (error) {
    return handleToolError(error);
  }
}

async function handleListContracts(params: Record<string, unknown>) {
  try {
    const results = listContracts({
      status: params.status as string | undefined,
      supplier: params.supplier as string | undefined,
    });
    return formatResponse({ count: results.length, contracts: results });
  } catch (error) {
    return handleToolError(error);
  }
}

async function handleUpdateContractStatus(params: Record<string, unknown>) {
  try {
    const result = updateContractStatus(params.id as string, params.status as string);
    if (!result) {
      return formatResponse({ success: false, message: `계약 ID '${params.id}'를 찾을 수 없습니다.` });
    }
    return formatResponse({ success: true, contract: result });
  } catch (error) {
    return handleToolError(error);
  }
}

export function registerContractTools(server: McpServer): void {
  server.tool(
    "ecount_contract_add_contract", "새로운 수입 계약을 등록합니다.",
    {
      contractNumber: z.string().describe("계약 번호 (예: CTR-2026-001)"),
      supplier: z.string().describe("공급사명 (예: BRF S.A., JBS)"),
      buyer: z.string(),
      product: z.string(),
      quantity: z.number().positive().describe("수량 (kg)"),
      unitPrice: z.number().positive().describe("단가 (USD/kg)"),
      currency: z.string().describe("통화 코드 (예: USD)"),
      incoterms: z.string().describe("인코텀즈 (예: CIF Busan)"),
      signedDate: z.string().optional().describe("YYYY-MM-DD"),
      expiryDate: z.string().optional().describe("YYYY-MM-DD"),
      status: z.enum(CONTRACT_STATUS),
      notes: z.string().optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    handleAddContract,
  );

  server.tool(
    "ecount_contract_get_contract", "계약 ID로 계약 정보를 조회합니다.",
    { id: z.string() },
    { readOnlyHint: true },
    handleGetContract,
  );

  server.tool(
    "ecount_contract_list_contracts", "계약 목록을 조회합니다. 상태 또는 공급사로 필터링 가능합니다.",
    { status: z.enum(CONTRACT_STATUS).optional(), supplier: z.string().optional() },
    { readOnlyHint: true },
    handleListContracts,
  );

  server.tool(
    "ecount_contract_update_contract_status", "계약 상태를 업데이트합니다.",
    { id: z.string(), status: z.enum(CONTRACT_STATUS) },
    { readOnlyHint: false, destructiveHint: false },
    handleUpdateContractStatus,
  );
}
