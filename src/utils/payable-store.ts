import { generateId } from "./id-generator.js";
import { nowIso } from "./date-helpers.js";

export interface PaymentOut {
  id: string;
  contractId: string;
  amount: number;
  currency: string;
  paymentDate: string;
  type: "advance" | "interim" | "final";
  createdAt: string;
}

export interface PayableContract {
  contractId: string;
  supplier: string;
  totalAmount: number;
  currency: string;
  dueDate: string;
}

export const paymentOuts = new Map<string, PaymentOut>();
export const payableContracts = new Map<string, PayableContract>();

export function recordPaymentOut(params: {
  contractId: string;
  amount: number;
  currency: string;
  paymentDate: string;
  type: "advance" | "interim" | "final";
}): PaymentOut {
  const payment: PaymentOut = {
    id: generateId("po"),
    contractId: params.contractId,
    amount: params.amount,
    currency: params.currency,
    paymentDate: params.paymentDate,
    type: params.type,
    createdAt: nowIso(),
  };
  paymentOuts.set(payment.id, payment);
  return payment;
}

export function registerPayableContract(params: Omit<PayableContract, never>): PayableContract {
  payableContracts.set(params.contractId, params);
  return params;
}
