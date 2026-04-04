import { nowIso } from "./date-helpers.js";
import { generateId } from "./id-generator.js";

export interface Contract {
  id: string;
  contractNumber: string;
  supplier: string;
  buyer: string;
  product: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  incoterms: string;
  signedDate?: string;
  expiryDate?: string;
  status: "draft" | "signed" | "active" | "completed" | "cancelled";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const CONTRACTS: Map<string, Contract> = new Map();

export function addContract(data: Omit<Contract, "id" | "createdAt" | "updatedAt">): Contract {
  const now = nowIso();
  const contract: Contract = { ...data, id: generateId("CTR"), createdAt: now, updatedAt: now };
  CONTRACTS.set(contract.id, contract);
  return contract;
}

export function getContract(id: string): Contract | null {
  return CONTRACTS.get(id) ?? null;
}

export function listContracts(filter?: { status?: string; supplier?: string }): Contract[] {
  let results = Array.from(CONTRACTS.values());
  if (filter?.status) results = results.filter((c) => c.status === filter.status);
  if (filter?.supplier) results = results.filter((c) => c.supplier === filter.supplier);
  return results;
}

export function updateContractStatus(id: string, status: string): Contract | null {
  const contract = CONTRACTS.get(id);
  if (!contract) return null;
  const updated: Contract = { ...contract, status: status as Contract["status"], updatedAt: nowIso() };
  CONTRACTS.set(id, updated);
  return updated;
}
