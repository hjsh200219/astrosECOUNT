import { generateId } from "./id-generator.js";
import { nowIso } from "./date-helpers.js";

export interface Payment {
  id: string;
  contractId: string;
  amount: number;
  currency: string;
  paymentDate: string;
  method: string;
  createdAt: string;
}

export interface ReceivableContract {
  contractId: string;
  buyer: string;
  totalAmount: number;
  currency: string;
  dueDate: string;
}

export const payments = new Map<string, Payment>();
export const receivableContracts = new Map<string, ReceivableContract>();

export function recordPayment(params: {
  contractId: string;
  amount: number;
  currency: string;
  paymentDate: string;
  method?: string;
}): Payment {
  const payment: Payment = {
    id: generateId("pay"),
    contractId: params.contractId,
    amount: params.amount,
    currency: params.currency,
    paymentDate: params.paymentDate,
    method: params.method ?? "bank_transfer",
    createdAt: nowIso(),
  };
  payments.set(payment.id, payment);
  return payment;
}

export function registerReceivableContract(params: Omit<ReceivableContract, never>): ReceivableContract {
  receivableContracts.set(params.contractId, params);
  return params;
}
