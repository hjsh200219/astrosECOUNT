import { describe, it, expect } from "vitest";
import { KeyPackV2Decoder } from "../../src/client/keypack.js";

describe("KeyPackV2Decoder", () => {
  const decoder = new KeyPackV2Decoder();

  describe("isKeyPackV2", () => {
    it("should return true for valid KeyPack V2 structure", () => {
      const data = ["__$KeyPack", { "00": "field1" }, { "00": "value1" }];
      expect(decoder.isKeyPackV2(data)).toBe(true);
    });

    it("should return false for non-array", () => {
      expect(decoder.isKeyPackV2("not an array")).toBe(false);
      expect(decoder.isKeyPackV2(null)).toBe(false);
      expect(decoder.isKeyPackV2(42)).toBe(false);
    });

    it("should return false for array without __$KeyPack marker", () => {
      expect(decoder.isKeyPackV2(["other", {}])).toBe(false);
      expect(decoder.isKeyPackV2([])).toBe(false);
    });
  });

  describe("decode", () => {
    it("should decode simple records", () => {
      const data = [
        "__$KeyPack",
        { "00": "inv_s$hid", "01": "inv_s$data_dt", "02": "inv_s$amount" },
        { "00": 1267321, "01": "20260327", "02": 50000 },
        { "00": 1267049, "01": "20260316", "02": 30000 },
      ];
      const result = decoder.decode(data);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        "inv_s$hid": 1267321,
        "inv_s$data_dt": "20260327",
        "inv_s$amount": 50000,
      });
      expect(result[1]).toEqual({
        "inv_s$hid": 1267049,
        "inv_s$data_dt": "20260316",
        "inv_s$amount": 30000,
      });
    });

    it("should preserve value types (numbers, strings, booleans)", () => {
      const data = [
        "__$KeyPack",
        { "00": "name", "01": "count", "02": "active" },
        { "00": "소고기", "01": 42, "02": true },
      ];
      const result = decoder.decode(data);
      expect(result[0].name).toBe("소고기");
      expect(result[0].count).toBe(42);
      expect(result[0].active).toBe(true);
    });

    it("should handle nested KeyPack V2 structures", () => {
      const data = [
        "__$KeyPack",
        { "00": "total_count", "01": "data" },
        {
          "00": 622,
          "01": [
            "__$KeyPack",
            { "00": "id", "01": "name" },
            { "00": 1, "01": "품목A" },
            { "00": 2, "01": "품목B" },
          ],
        },
      ];
      const result = decoder.decode(data);
      expect(result).toHaveLength(1);
      expect(result[0].total_count).toBe(622);
      expect(result[0].data).toEqual([
        { id: 1, name: "품목A" },
        { id: 2, name: "품목B" },
      ]);
    });

    it("should return empty array when no record entries exist", () => {
      const data = ["__$KeyPack", { "00": "field1" }];
      const result = decoder.decode(data);
      expect(result).toEqual([]);
    });

    it("should handle missing keys in records gracefully", () => {
      const data = [
        "__$KeyPack",
        { "00": "a", "01": "b", "02": "c" },
        { "00": 1 }, // missing 01 and 02
      ];
      const result = decoder.decode(data);
      expect(result).toHaveLength(1);
      expect(result[0].a).toBe(1);
      expect(result[0].b).toBeUndefined();
      expect(result[0].c).toBeUndefined();
    });

    it("should handle null and undefined values", () => {
      const data = [
        "__$KeyPack",
        { "00": "field1", "01": "field2" },
        { "00": null, "01": "value" },
      ];
      const result = decoder.decode(data);
      expect(result[0].field1).toBeNull();
      expect(result[0].field2).toBe("value");
    });

    it("should enforce max recursion depth", () => {
      // Build deeply nested structure (6 levels, should fail at depth 5)
      let nested: unknown[] = ["__$KeyPack", { "00": "val" }, { "00": "leaf" }];
      for (let i = 0; i < 6; i++) {
        nested = ["__$KeyPack", { "00": "child" }, { "00": nested }];
      }
      // Should not throw but should stop recursing at max depth
      const result = decoder.decode(nested);
      expect(result).toHaveLength(1);
    });
  });
});
