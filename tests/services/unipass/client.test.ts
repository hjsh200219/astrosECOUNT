import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getUnipassApiKey,
  buildUnipassUrl,
  normalizeItems,
  parseUnipassXml,
} from "../../../src/services/unipass/client.js";

// ---------------------------------------------------------------------------
// getUnipassApiKey
// ---------------------------------------------------------------------------

describe("getUnipassApiKey", () => {
  const ENV_KEY = "UNIPASS_KEY_API1";
  let original: string | undefined;

  beforeEach(() => {
    original = process.env[ENV_KEY];
  });

  afterEach(() => {
    if (original !== undefined) {
      process.env[ENV_KEY] = original;
    } else {
      delete process.env[ENV_KEY];
    }
  });

  it("returns the key when the environment variable is set", () => {
    process.env[ENV_KEY] = "test-api-key-abc";
    expect(getUnipassApiKey("1")).toBe("test-api-key-abc");
  });

  it("throws when the environment variable is missing", () => {
    delete process.env[ENV_KEY];
    expect(() => getUnipassApiKey("1")).toThrow(
      "UNIPASS_KEY_API1 환경변수가 설정되지 않았습니다.",
    );
  });

  it("throws with the correct env name for different apiId values", () => {
    expect(() => getUnipassApiKey("99")).toThrow("UNIPASS_KEY_API99");
  });
});

// ---------------------------------------------------------------------------
// buildUnipassUrl
// ---------------------------------------------------------------------------

describe("buildUnipassUrl", () => {
  it("constructs a URL with crkyCn and no extra params", () => {
    const url = buildUnipassUrl("/BrkDty/retrieveBrkDtyList", "mykey123");
    expect(url).toBe(
      "https://unipass.customs.go.kr:38010/ext/rest/BrkDty/retrieveBrkDtyList?crkyCn=mykey123",
    );
  });

  it("includes additional query parameters", () => {
    const url = buildUnipassUrl("/HsCode/search", "key456", {
      hsSgn: "0101",
      pageNo: "1",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("crkyCn")).toBe("key456");
    expect(parsed.searchParams.get("hsSgn")).toBe("0101");
    expect(parsed.searchParams.get("pageNo")).toBe("1");
  });

  it("normalizes path without leading slash", () => {
    const url = buildUnipassUrl("BrkDty/list", "keyABC");
    expect(url).toContain("/ext/rest/BrkDty/list");
  });

  it("skips empty-string param values", () => {
    const url = buildUnipassUrl("/test", "k", { empty: "", filled: "yes" });
    const parsed = new URL(url);
    expect(parsed.searchParams.has("empty")).toBe(false);
    expect(parsed.searchParams.get("filled")).toBe("yes");
  });
});

// ---------------------------------------------------------------------------
// normalizeItems
// ---------------------------------------------------------------------------

describe("normalizeItems", () => {
  it("wraps a single object into an array", () => {
    const item = { hsSgn: "0101", hsSgnNm: "Live horses" };
    expect(normalizeItems(item)).toEqual([item]);
  });

  it("returns an array as-is", () => {
    const items = [
      { hsSgn: "0101", hsSgnNm: "Live horses" },
      { hsSgn: "0201", hsSgnNm: "Meat of bovine" },
    ];
    expect(normalizeItems(items)).toEqual(items);
  });

  it("returns empty array for null", () => {
    expect(normalizeItems(null)).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(normalizeItems(undefined)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parseUnipassXml
// ---------------------------------------------------------------------------

describe("parseUnipassXml", () => {
  it("parses a simple XML string to a JS object", () => {
    const xml = `
      <response>
        <resultCode>0</resultCode>
        <resultMessage>SUCCESS</resultMessage>
        <tCnt>1</tCnt>
      </response>
    `;
    const result = parseUnipassXml(xml);
    expect(result).toHaveProperty("response");
    const root = result.response as Record<string, unknown>;
    expect(root.resultCode).toBe(0);
    expect(root.resultMessage).toBe("SUCCESS");
    expect(root.tCnt).toBe(1);
  });
});
