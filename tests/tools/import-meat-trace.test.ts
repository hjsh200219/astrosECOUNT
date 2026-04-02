import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  fetchImportMeatTrace,
  type MeatTraceRecord,
  type MeatTraceSearchParams,
  type MeatTraceResponse,
} from "../../src/tools/import-meat-trace.js";

function mockMafraXmlResponse(records: Partial<MeatTraceRecord>[] = [], totalCnt = 1) {
  const rows = records
    .map(
      (r) => `<row>
        <DISTB_IDNTFC_NO>${r.DISTB_IDNTFC_NO ?? ""}</DISTB_IDNTFC_NO>
        <PRDLST_NM>${r.PRDLST_NM ?? ""}</PRDLST_NM>
        <BL_NO>${r.BL_NO ?? ""}</BL_NO>
        <ORGPLCE_NATION>${r.ORGPLCE_NATION ?? ""}</ORGPLCE_NATION>
        <EXCOURY_SLAU_START_DE>${r.EXCOURY_SLAU_START_DE ?? ""}</EXCOURY_SLAU_START_DE>
        <EXCOURY_SLAU_END_DE>${r.EXCOURY_SLAU_END_DE ?? ""}</EXCOURY_SLAU_END_DE>
        <EXCOURY_SLAU_HSE_NM>${r.EXCOURY_SLAU_HSE_NM ?? ""}</EXCOURY_SLAU_HSE_NM>
        <EXCOURY_PRCSS_START_DE>${r.EXCOURY_PRCSS_START_DE ?? ""}</EXCOURY_PRCSS_START_DE>
        <EXCOURY_PRCSS_END_DE>${r.EXCOURY_PRCSS_END_DE ?? ""}</EXCOURY_PRCSS_END_DE>
        <EXCOURY_PRCSS_HSE_NM>${r.EXCOURY_PRCSS_HSE_NM ?? ""}</EXCOURY_PRCSS_HSE_NM>
        <EXPORT_BSSH_NM>${r.EXPORT_BSSH_NM ?? ""}</EXPORT_BSSH_NM>
        <IMPORT_BSSH_NM>${r.IMPORT_BSSH_NM ?? ""}</IMPORT_BSSH_NM>
        <IMPORT_DE>${r.IMPORT_DE ?? ""}</IMPORT_DE>
        <PRDLST_CD>${r.PRDLST_CD ?? ""}</PRDLST_CD>
        <SLE_AT>${r.SLE_AT ?? ""}</SLE_AT>
      </row>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Grid_20141226000000000174_1>
  <totalCnt>${totalCnt}</totalCnt>
  <startRow>1</startRow>
  <endRow>${records.length}</endRow>
  <result>
    <code>INFO-000</code>
    <message>정상 처리되었습니다.</message>
  </result>
  ${rows}
</Grid_20141226000000000174_1>`;

  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => xml,
  });
}

function mockMafraErrorResponse(code = "ERROR-300", message = "잘못된 인증키입니다.") {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Grid_20141226000000000174_1>
  <totalCnt>0</totalCnt>
  <startRow>0</startRow>
  <endRow>0</endRow>
  <result>
    <code>${code}</code>
    <message>${message}</message>
  </result>
</Grid_20141226000000000174_1>`;

  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => xml,
  });
}

describe("fetchImportMeatTrace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch and parse a single record from MAFRA API", async () => {
    mockMafraXmlResponse([
      {
        DISTB_IDNTFC_NO: "1234567890123",
        PRDLST_NM: "쇠고기(갈비)",
        BL_NO: "MAEUTEY012270",
        ORGPLCE_NATION: "호주",
        EXCOURY_SLAU_START_DE: "20260101",
        EXCOURY_SLAU_END_DE: "20260102",
        EXCOURY_SLAU_HSE_NM: "호주도축장A",
        EXCOURY_PRCSS_START_DE: "20260103",
        EXCOURY_PRCSS_END_DE: "20260104",
        EXCOURY_PRCSS_HSE_NM: "호주가공장B",
        EXPORT_BSSH_NM: "호주수출사",
        IMPORT_BSSH_NM: "한국수입사",
        IMPORT_DE: "20260110",
        PRDLST_CD: "2110111211",
        SLE_AT: "Y",
      },
    ]);

    const result = await fetchImportMeatTrace("test-api-key", {
      importDate: "20260110",
    });

    expect(result.totalCount).toBe(1);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].DISTB_IDNTFC_NO).toBe("1234567890123");
    expect(result.records[0].PRDLST_NM).toBe("쇠고기(갈비)");
    expect(result.records[0].BL_NO).toBe("MAEUTEY012270");
    expect(result.records[0].ORGPLCE_NATION).toBe("호주");
    expect(result.records[0].IMPORT_BSSH_NM).toBe("한국수입사");
  });

  it("should build correct URL with all optional params", async () => {
    mockMafraXmlResponse([], 0);

    await fetchImportMeatTrace("my-key", {
      importDate: "20260110",
      productCode: "2110111211",
      blNo: "MAEUTEY012270",
      originCountry: "호주",
      saleStatus: "Y",
      startIndex: 1,
      endIndex: 10,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/my-key/xml/Grid_20141226000000000174_1/1/10");
    expect(calledUrl).toContain("IMPORT_DE=20260110");
    expect(calledUrl).toContain("PRDLST_CD=2110111211");
    expect(calledUrl).toContain("BL_NO=MAEUTEY012270");
    expect(calledUrl).toContain("ORGPLCE_NATION=%ED%98%B8%EC%A3%BC");
    expect(calledUrl).toContain("SLE_AT=Y");
  });

  it("should use default pagination (1/100) when not specified", async () => {
    mockMafraXmlResponse([], 0);

    await fetchImportMeatTrace("my-key", { importDate: "20260301" });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/my-key/xml/Grid_20141226000000000174_1/1/100");
  });

  it("should parse multiple records", async () => {
    mockMafraXmlResponse(
      [
        { DISTB_IDNTFC_NO: "AAA", PRDLST_NM: "쇠고기", BL_NO: "BL001" },
        { DISTB_IDNTFC_NO: "BBB", PRDLST_NM: "돼지고기", BL_NO: "BL002" },
        { DISTB_IDNTFC_NO: "CCC", PRDLST_NM: "쇠고기(등심)", BL_NO: "BL003" },
      ],
      3,
    );

    const result = await fetchImportMeatTrace("key", { importDate: "20260101" });

    expect(result.totalCount).toBe(3);
    expect(result.records).toHaveLength(3);
    expect(result.records[0].DISTB_IDNTFC_NO).toBe("AAA");
    expect(result.records[1].DISTB_IDNTFC_NO).toBe("BBB");
    expect(result.records[2].DISTB_IDNTFC_NO).toBe("CCC");
  });

  it("should return empty records on API error response", async () => {
    mockMafraErrorResponse("ERROR-300", "잘못된 인증키입니다.");

    const result = await fetchImportMeatTrace("bad-key", { importDate: "20260101" });

    expect(result.totalCount).toBe(0);
    expect(result.records).toHaveLength(0);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("ERROR-300");
  });

  it("should throw on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    await expect(
      fetchImportMeatTrace("key", { importDate: "20260101" }),
    ).rejects.toThrow("네트워크 연결 오류");
  });

  it("should throw on non-OK HTTP response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });

    await expect(
      fetchImportMeatTrace("key", { importDate: "20260101" }),
    ).rejects.toThrow("수입축산물 이력 API HTTP 오류: 500");
  });

  it("should handle empty totalCnt gracefully", async () => {
    mockMafraXmlResponse([], 0);

    const result = await fetchImportMeatTrace("key", { importDate: "20260101" });

    expect(result.totalCount).toBe(0);
    expect(result.records).toHaveLength(0);
    expect(result.error).toBeUndefined();
  });
});

describe("registerImportMeatTraceTools", () => {
  it("should register 2 tools (search + lookup) without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerImportMeatTraceTools } = await import("../../src/tools/import-meat-trace.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerImportMeatTraceTools(server)).not.toThrow();
  });
});

describe("loadMafraConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return config when MAFRA_API_KEY is set", async () => {
    process.env.MAFRA_API_KEY = "test-key-123";
    const { loadMafraConfig } = await import("../../src/config.js");
    const config = loadMafraConfig();
    expect(config).not.toBeNull();
    expect(config!.MAFRA_API_KEY).toBe("test-key-123");
  });

  it("should return null when MAFRA_API_KEY is not set", async () => {
    delete process.env.MAFRA_API_KEY;
    const { loadMafraConfig } = await import("../../src/config.js");
    const config = loadMafraConfig();
    expect(config).toBeNull();
  });
});
