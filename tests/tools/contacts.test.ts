import { describe, it, expect } from "vitest";
import {
  lookupContact,
  listContacts,
  type Contact,
} from "../../src/tools/contacts.js";

describe("lookupContact", () => {
  it("should find contact by name (Korean)", () => {
    const result = lookupContact("김민수");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("김민수");
    expect(result!.company).toBe("삼현INT");
  });

  it("should find contact by company", () => {
    const results = listContacts({ company: "정운관세법인" });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((c) => c.company === "정운관세법인")).toBe(true);
  });

  it("should find contact by role", () => {
    const results = listContacts({ role: "관세사" });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("should return null for unknown contact", () => {
    const result = lookupContact("존재하지않는사람");
    expect(result).toBeNull();
  });

  it("should return all contacts when no filter", () => {
    const results = listContacts({});
    expect(results.length).toBeGreaterThanOrEqual(10);
  });
});

describe("registerContactTools", () => {
  it("should register contact tools without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerContactTools } = await import("../../src/tools/contacts.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerContactTools(server)).not.toThrow();
  });
});

describe("contact email and phone data", () => {
  it("should have email on all 13 contacts", () => {
    const all = listContacts({});
    expect(all.length).toBe(13);
    for (const contact of all) {
      expect(contact.email, `${contact.name} is missing email`).toBeTruthy();
      expect(contact.email!.length, `${contact.name} email is empty`).toBeGreaterThan(0);
    }
  });

  it("should have phone on all 13 contacts", () => {
    const all = listContacts({});
    expect(all.length).toBe(13);
    for (const contact of all) {
      expect(contact.phone, `${contact.name} is missing phone`).toBeTruthy();
      expect(contact.phone!.length, `${contact.name} phone is empty`).toBeGreaterThan(0);
    }
  });

  it("should have valid email format (contains @) for all contacts", () => {
    const all = listContacts({});
    for (const contact of all) {
      expect(contact.email, `${contact.name} email should contain @`).toContain("@");
    }
  });

  it("lookupContact should return email and phone", () => {
    const contact = lookupContact("김민수");
    expect(contact).not.toBeNull();
    expect(contact!.email).toBeTruthy();
    expect(contact!.email).toContain("@");
    expect(contact!.phone).toBeTruthy();
  });

  it("lookupContact for Maria Silva should return email and phone", () => {
    const contact = lookupContact("Maria Silva");
    expect(contact).not.toBeNull();
    expect(contact!.email).toBeTruthy();
    expect(contact!.email).toContain("@");
    expect(contact!.phone).toBeTruthy();
  });

  it("아스트로스 contacts should use @astros.co.kr domain", () => {
    const astros = listContacts({ company: "아스트로스" });
    expect(astros.length).toBe(5);
    for (const c of astros) {
      expect(c.email).toContain("@astros.co.kr");
    }
  });

  it("삼현INT contacts should use @samhyun-int.co.kr domain", () => {
    const contacts = listContacts({ company: "삼현INT" });
    expect(contacts.length).toBe(2);
    for (const c of contacts) {
      expect(c.email).toContain("@samhyun-int.co.kr");
    }
  });

  it("정운관세법인 contacts should use @jungwoon.co.kr domain", () => {
    const contacts = listContacts({ company: "정운관세법인" });
    expect(contacts.length).toBe(3);
    for (const c of contacts) {
      expect(c.email).toContain("@jungwoon.co.kr");
    }
  });
});
