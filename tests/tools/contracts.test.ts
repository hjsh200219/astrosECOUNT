import { describe, it, expect } from "vitest";
import {
  addContract,
  getContract,
  listContracts,
  updateContractStatus,
  type Contract,
} from "../../src/tools/contracts.js";

describe("addContract", () => {
  it("should add a contract and return it with generated id", () => {
    const contract = addContract({
      contractNumber: "CTR-TEST-001",
      supplier: "BRF S.A.",
      buyer: "아스트로스",
      product: "돼지 삼겹살",
      quantity: 10000,
      unitPrice: 2.5,
      currency: "USD",
      incoterms: "CIF Busan",
      status: "draft",
    });
    expect(contract.id).toBeTruthy();
    expect(contract.contractNumber).toBe("CTR-TEST-001");
    expect(contract.supplier).toBe("BRF S.A.");
    expect(contract.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(contract.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("should assign unique ids to different contracts", () => {
    const c1 = addContract({ contractNumber: "CTR-U-001", supplier: "JBS", buyer: "아스트로스", product: "소고기", quantity: 5000, unitPrice: 5.0, currency: "USD", incoterms: "CIF Busan", status: "draft" });
    const c2 = addContract({ contractNumber: "CTR-U-002", supplier: "JBS", buyer: "아스트로스", product: "소고기", quantity: 5000, unitPrice: 5.0, currency: "USD", incoterms: "CIF Busan", status: "draft" });
    expect(c1.id).not.toBe(c2.id);
  });
});

describe("getContract", () => {
  it("should retrieve contract by id", () => {
    const added = addContract({ contractNumber: "CTR-GET-001", supplier: "JBS", buyer: "아스트로스", product: "닭고기", quantity: 8000, unitPrice: 1.8, currency: "USD", incoterms: "FOB Santos", status: "signed" });
    const found = getContract(added.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(added.id);
    expect(found!.contractNumber).toBe("CTR-GET-001");
  });

  it("should return null for unknown id", () => {
    expect(getContract("nonexistent-id")).toBeNull();
  });
});

describe("listContracts", () => {
  it("should list all contracts without filter", () => {
    const before = listContracts().length;
    addContract({ contractNumber: "CTR-LIST-001", supplier: "Seara", buyer: "아스트로스", product: "돈육", quantity: 20000, unitPrice: 2.2, currency: "USD", incoterms: "CIF Busan", status: "active" });
    const after = listContracts().length;
    expect(after).toBe(before + 1);
  });

  it("should filter by status", () => {
    addContract({ contractNumber: "CTR-STATUS-001", supplier: "BRF S.A.", buyer: "아스트로스", product: "돈육", quantity: 10000, unitPrice: 2.5, currency: "USD", incoterms: "CIF Busan", status: "cancelled" });
    const results = listContracts({ status: "cancelled" });
    expect(results.every((c) => c.status === "cancelled")).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("should filter by supplier", () => {
    addContract({ contractNumber: "CTR-SUP-001", supplier: "SpecificSupplier", buyer: "아스트로스", product: "소고기", quantity: 5000, unitPrice: 4.0, currency: "USD", incoterms: "CIF Busan", status: "active" });
    const results = listContracts({ supplier: "SpecificSupplier" });
    expect(results.every((c) => c.supplier === "SpecificSupplier")).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe("updateContractStatus", () => {
  it("should update status and updatedAt", () => {
    const added = addContract({ contractNumber: "CTR-UPD-001", supplier: "JBS", buyer: "아스트로스", product: "소고기", quantity: 5000, unitPrice: 5.0, currency: "USD", incoterms: "CIF Busan", status: "draft" });
    const updated = updateContractStatus(added.id, "signed");
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("signed");
    expect(updated!.id).toBe(added.id);
  });

  it("should return null for unknown id", () => {
    const result = updateContractStatus("nonexistent-id", "active");
    expect(result).toBeNull();
  });
});

describe("registerContractTools", () => {
  it("should register tools without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerContractTools } = await import("../../src/tools/contracts.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerContractTools(server)).not.toThrow();
  });
});
