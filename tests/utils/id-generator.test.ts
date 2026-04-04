import { describe, it, expect } from "vitest";
import { generateId } from "../../src/utils/id-generator.js";

describe("generateId", () => {
  it("should generate an id with the given prefix", () => {
    const id = generateId("TEST");
    expect(id).toMatch(/^TEST-\d+-\d+$/);
  });

  it("should generate unique ids for the same prefix", () => {
    const id1 = generateId("UNQ");
    const id2 = generateId("UNQ");
    expect(id1).not.toBe(id2);
  });

  it("should maintain separate counters per prefix", () => {
    const a1 = generateId("AAA");
    const b1 = generateId("BBB");
    const a2 = generateId("AAA");

    expect(a1).toMatch(/^AAA-/);
    expect(b1).toMatch(/^BBB-/);
    expect(a2).toMatch(/^AAA-/);
    expect(a1).not.toBe(a2);
  });

  it("should increment counter sequentially", () => {
    const id1 = generateId("SEQ");
    const id2 = generateId("SEQ");

    const counter1 = Number(id1.split("-").pop());
    const counter2 = Number(id2.split("-").pop());
    expect(counter2).toBe(counter1 + 1);
  });
});
