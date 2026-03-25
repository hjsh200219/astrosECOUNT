import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatResponse } from "../utils/response-formatter.js";
import { handleToolError } from "../utils/error-handler.js";

export interface Contract {
  id: string;
  contractNumber: string;  // e.g. "CTR-2026-001"
  supplier: string;        // e.g. "BRF S.A."
  buyer: string;           // e.g. "아스트로스"
  product: string;
  quantity: number;        // kg
  unitPrice: number;       // USD per kg
  currency: string;
  incoterms: string;       // e.g. "CIF Busan"
  signedDate?: string;
  expiryDate?: string;
  status: "draft" | "signed" | "active" | "completed" | "cancelled";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const CONTRACTS: Map<string, Contract> = new Map();
let idCounter = 1;

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(): string {
  return `CTR-${Date.now()}-${idCounter++}`;
}

export function addContract(data: Omit<Contract, "id" | "createdAt" | "updatedAt">): Contract {
  const now = nowIso();
  const contract: Contract = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  CONTRACTS.set(contract.id, contract);
  return contract;
}

export function getContract(id: string): Contract | null {
  return CONTRACTS.get(id) ?? null;
}

export function listContracts(filter?: { status?: string; supplier?: string }): Contract[] {
  let results = Array.from(CONTRACTS.values());
  if (filter?.status) {
    results = results.filter((c) => c.status === filter.status);
  }
  if (filter?.supplier) {
    results = results.filter((c) => c.supplier === filter.supplier);
  }
  return results;
}

export function updateContractStatus(id: string, status: string): Contract | null {
  const contract = CONTRACTS.get(id);
  if (!contract) return null;
  const updated: Contract = {
    ...contract,
    status: status as Contract["status"],
    updatedAt: nowIso(),
  };
  CONTRACTS.set(id, updated);
  return updated;
}

export function registerContractTools(server: McpServer): void {
  server.tool(
    "ecount_add_contract",
    "새로운 수입 계약을 등록합니다.",
    {
      contractNumber: z.string().describe("계약 번호 (예: CTR-2026-001)"),
      supplier: z.string().describe("공급사명 (예: BRF S.A., JBS)"),
      buyer: z.string().describe("구매사명 (예: 아스트로스)"),
      product: z.string().describe("품목명"),
      quantity: z.number().positive().describe("수량 (kg)"),
      unitPrice: z.number().positive().describe("단가 (USD/kg)"),
      currency: z.string().describe("통화 코드 (예: USD)"),
      incoterms: z.string().describe("인코텀즈 (예: CIF Busan)"),
      signedDate: z.string().optional().describe("계약 서명일 YYYY-MM-DD"),
      expiryDate: z.string().optional().describe("계약 만료일 YYYY-MM-DD"),
      status: z
        .enum(["draft", "signed", "active", "completed", "cancelled"])
        .describe("계약 상태"),
      notes: z.string().optional().describe("메모"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (params: Record<string, unknown>) => {
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
  );

  server.tool(
    "ecount_get_contract",
    "계약 ID로 계약 정보를 조회합니다.",
    {
      id: z.string().describe("계약 ID"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
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
  );

  server.tool(
    "ecount_list_contracts",
    "계약 목록을 조회합니다. 상태 또는 공급사로 필터링 가능합니다.",
    {
      status: z
        .enum(["draft", "signed", "active", "completed", "cancelled"])
        .optional()
        .describe("상태 필터"),
      supplier: z.string().optional().describe("공급사 필터"),
    },
    { readOnlyHint: true },
    async (params: Record<string, unknown>) => {
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
  );

  server.tool(
    "ecount_update_contract_status",
    "계약 상태를 업데이트합니다.",
    {
      id: z.string().describe("계약 ID"),
      status: z
        .enum(["draft", "signed", "active", "completed", "cancelled"])
        .describe("새로운 상태"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (params: Record<string, unknown>) => {
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
  );
}
