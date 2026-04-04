import { describe, it, expect } from "vitest";
import {
  addContract,
  getContract,
  listContracts,
  updateContractStatus,
} from "../../src/utils/contract-store.js";

describe("contract-store", () => {
  it("addContract should create a contract with id and timestamps", () => {
    const contract = addContract({
      contractNumber: "CTR-TEST-001",
      supplier: "BRF",
      buyer: "아스트로스",
      product: "닭다리",
      quantity: 20000,
      unitPrice: 3.5,
      currency: "USD",
      incoterms: "CIF Busan",
      status: "draft",
    });
    expect(contract.id).toMatch(/^CTR-/);
    expect(contract.contractNumber).toBe("CTR-TEST-001");
    expect(contract.createdAt).toBeTruthy();
  });

  it("getContract should return existing contract", () => {
    const created = addContract({
      contractNumber: "CTR-GET-001",
      supplier: "JBS",
      buyer: "아스트로스",
      product: "등심",
      quantity: 10000,
      unitPrice: 8.0,
      currency: "USD",
      incoterms: "FOB Santos",
      status: "active",
    });
    const found = getContract(created.id);
    expect(found).not.toBeNull();
    expect(found!.supplier).toBe("JBS");
  });

  it("getContract should return null for non-existent id", () => {
    expect(getContract("non-existent")).toBeNull();
  });

  it("listContracts should filter by status", () => {
    addContract({
      contractNumber: "CTR-FILTER-001",
      supplier: "Marfrig",
      buyer: "아스트로스",
      product: "삼겹살",
      quantity: 5000,
      unitPrice: 4.0,
      currency: "USD",
      incoterms: "CIF Busan",
      status: "completed",
    });
    const completed = listContracts({ status: "completed" });
    expect(completed.every((c) => c.status === "completed")).toBe(true);
  });

  it("updateContractStatus should update status", () => {
    const created = addContract({
      contractNumber: "CTR-UPD-001",
      supplier: "Minerva",
      buyer: "아스트로스",
      product: "사태",
      quantity: 3000,
      unitPrice: 5.0,
      currency: "USD",
      incoterms: "CIF Busan",
      status: "draft",
    });
    const updated = updateContractStatus(created.id, "signed");
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("signed");
  });

  it("updateContractStatus should return null for non-existent id", () => {
    expect(updateContractStatus("non-existent", "active")).toBeNull();
  });
});
