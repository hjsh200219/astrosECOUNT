import { describe, it, expect } from "vitest";
import { KeyPackEncoder, KeyPackDecoder } from "../../src/client/keypack.js";

describe("KeyPackEncoder", () => {
  describe("encode", () => {
    it("should encode simple key-value pairs into KeyPack format", () => {
      const encoder = new KeyPackEncoder();
      const params = {
        FROM_DATE: "20260101",
        TO_DATE: "20260331",
      };

      const encoded = encoder.encode(params);

      // KeyPack format: Base64-encoded serialized data
      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe("string");
      // Should be decodable
      const decoded = new KeyPackDecoder().decode(encoded);
      expect(decoded.FROM_DATE).toBe("20260101");
      expect(decoded.TO_DATE).toBe("20260331");
    });

    it("should encode empty string values correctly", () => {
      const encoder = new KeyPackEncoder();
      const params = {
        FROM_DATE: "20260101",
        CUST_CD: "",
        PROD_CD: "",
      };

      const encoded = encoder.encode(params);
      const decoded = new KeyPackDecoder().decode(encoded);

      expect(decoded.CUST_CD).toBe("");
      expect(decoded.PROD_CD).toBe("");
    });

    it("should encode numeric values as strings", () => {
      const encoder = new KeyPackEncoder();
      const params = {
        PAGE: 1,
        PER_PAGE: 20,
      };

      const encoded = encoder.encode(params);
      const decoded = new KeyPackDecoder().decode(encoded);

      expect(decoded.PAGE).toBe("1");
      expect(decoded.PER_PAGE).toBe("20");
    });

    it("should encode Korean characters correctly", () => {
      const encoder = new KeyPackEncoder();
      const params = {
        PROD_NM: "돈육 목살",
        WH_CD: "미착_2x",
      };

      const encoded = encoder.encode(params);
      const decoded = new KeyPackDecoder().decode(encoded);

      expect(decoded.PROD_NM).toBe("돈육 목살");
      expect(decoded.WH_CD).toBe("미착_2x");
    });

    it("should handle special characters", () => {
      const encoder = new KeyPackEncoder();
      const params = {
        MEMO: "test&value=1|2",
        DESC: "a=b&c=d",
      };

      const encoded = encoder.encode(params);
      const decoded = new KeyPackDecoder().decode(encoded);

      expect(decoded.MEMO).toBe("test&value=1|2");
      expect(decoded.DESC).toBe("a=b&c=d");
    });

    it("should produce deterministic output for same input", () => {
      const encoder = new KeyPackEncoder();
      const params = { A: "1", B: "2" };

      const encoded1 = encoder.encode(params);
      const encoded2 = encoder.encode(params);

      expect(encoded1).toBe(encoded2);
    });
  });
});

describe("KeyPackDecoder", () => {
  describe("decode", () => {
    it("should decode a valid KeyPack string back to params", () => {
      const encoder = new KeyPackEncoder();
      const decoder = new KeyPackDecoder();

      const original = {
        FROM_DATE: "20260101",
        TO_DATE: "20260331",
        PAGE: 1,
        PER_PAGE: 20,
      };

      const encoded = encoder.encode(original);
      const decoded = decoder.decode(encoded);

      expect(decoded.FROM_DATE).toBe("20260101");
      expect(decoded.TO_DATE).toBe("20260331");
    });

    it("should throw on invalid/corrupted KeyPack data", () => {
      const decoder = new KeyPackDecoder();

      expect(() => decoder.decode("not-valid-keypack")).toThrow();
      expect(() => decoder.decode("")).toThrow();
    });
  });
});

describe("KeyPack roundtrip", () => {
  it("should preserve all fields through encode → decode", () => {
    const encoder = new KeyPackEncoder();
    const decoder = new KeyPackDecoder();

    const params = {
      FROM_DATE: "20260101",
      TO_DATE: "20260331",
      CUST_CD: "C001",
      PROD_CD: "P001",
      SLIP_TYPE: "1",
      ACCOUNT_CD: "110",
      PAGE: 1,
      PER_PAGE: 20,
      MEMO: "테스트 메모 & 특수문자",
    };

    const encoded = encoder.encode(params);
    const decoded = decoder.decode(encoded);

    expect(decoded.FROM_DATE).toBe("20260101");
    expect(decoded.TO_DATE).toBe("20260331");
    expect(decoded.CUST_CD).toBe("C001");
    expect(decoded.PROD_CD).toBe("P001");
    expect(decoded.SLIP_TYPE).toBe("1");
    expect(decoded.ACCOUNT_CD).toBe("110");
    expect(decoded.PAGE).toBe("1");
    expect(decoded.PER_PAGE).toBe("20");
    expect(decoded.MEMO).toBe("테스트 메모 & 특수문자");
  });
});
