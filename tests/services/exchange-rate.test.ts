import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";

// ---------------------------------------------------------------------------
// Mock UNI-PASS customs-rate before importing the module under test
// ---------------------------------------------------------------------------

vi.mock("../../src/services/unipass/customs-rate.js", () => ({
  fetchCustomsExchangeRates: vi.fn().mockResolvedValue([]),
}));

import {
  fetchMarketRates,
  fetchCustomsRates,
  getExchangeRate,
  listExchangeRates,
  _resetCache,
} from "../../src/services/exchange-rate.js";
import { fetchCustomsExchangeRates } from "../../src/services/unipass/customs-rate.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockedCustomsFetch = vi.mocked(fetchCustomsExchangeRates);

const SAMPLE_KOREAEXIM_RESPONSE = JSON.stringify([
  { cur_unit: "USD", deal_bas_r: "1,350.5", cur_nm: "미 달러" },
  { cur_unit: "EUR", deal_bas_r: "1,470.2", cur_nm: "유로" },
  { cur_unit: "JPY(100)", deal_bas_r: "920.8", cur_nm: "일본 엔" },
  { cur_unit: "GBP", deal_bas_r: "1,700.0", cur_nm: "영국 파운드" },
]);

function mockFetchOk(body: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(JSON.parse(body)),
    headers: new Headers(),
  });
}

function mockFetch302ThenOk(body: string) {
  let callCount = 0;
  return vi.fn().mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      // First call: 302 with Set-Cookie
      return Promise.resolve({
        ok: false,
        status: 302,
        text: () => Promise.resolve(""),
        headers: new Headers({ "set-cookie": "JSESSIONID=abc123; Path=/" }),
      });
    }
    // Second call: success
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(body),
      json: () => Promise.resolve(JSON.parse(body)),
      headers: new Headers(),
    });
  });
}

// ---------------------------------------------------------------------------
// Environment variable management
// ---------------------------------------------------------------------------

let savedExchangeKey: string | undefined;
let savedGovKey: string | undefined;

beforeEach(() => {
  savedExchangeKey = process.env.EXCHANGE_RATE_API_KEY;
  savedGovKey = process.env.GOV_SERVICE_KEY;
  _resetCache();
  mockedCustomsFetch.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  // Restore env vars
  if (savedExchangeKey !== undefined) {
    process.env.EXCHANGE_RATE_API_KEY = savedExchangeKey;
  } else {
    delete process.env.EXCHANGE_RATE_API_KEY;
  }
  if (savedGovKey !== undefined) {
    process.env.GOV_SERVICE_KEY = savedGovKey;
  } else {
    delete process.env.GOV_SERVICE_KEY;
  }
});

// ---------------------------------------------------------------------------
// fetchMarketRates
// ---------------------------------------------------------------------------

describe("fetchMarketRates", () => {
  it("returns empty when EXCHANGE_RATE_API_KEY is not set", async () => {
    delete process.env.EXCHANGE_RATE_API_KEY;
    const result = await fetchMarketRates();
    expect(result).toEqual([]);
  });

  it("parses USD, EUR, JPY from Korea Exim Bank response", async () => {
    process.env.EXCHANGE_RATE_API_KEY = "test-key";
    vi.stubGlobal("fetch", mockFetchOk(SAMPLE_KOREAEXIM_RESPONSE));

    const result = await fetchMarketRates();

    expect(result).toHaveLength(3);

    const usd = result.find((r) => r.currency === "USD");
    expect(usd).toBeDefined();
    expect(usd!.rate).toBe(1350.5);
    expect(usd!.source).toBe("api");

    const eur = result.find((r) => r.currency === "EUR");
    expect(eur).toBeDefined();
    expect(eur!.rate).toBe(1470.2);

    // JPY(100) -> per-yen rate (divide by 100)
    const jpy = result.find((r) => r.currency === "JPY");
    expect(jpy).toBeDefined();
    expect(jpy!.rate).toBeCloseTo(9.208, 3);
  });

  it("handles 302 redirect with cookie-based auth", async () => {
    process.env.EXCHANGE_RATE_API_KEY = "test-key";
    const mockFn = mockFetch302ThenOk(SAMPLE_KOREAEXIM_RESPONSE);
    vi.stubGlobal("fetch", mockFn);

    const result = await fetchMarketRates();

    // First call should be the initial request, second should include cookie
    expect(mockFn).toHaveBeenCalledTimes(2);
    const secondCallArgs = mockFn.mock.calls[1];
    expect(secondCallArgs[1]).toHaveProperty("headers");
    expect((secondCallArgs[1] as RequestInit).headers).toHaveProperty(
      "Cookie",
      "JSESSIONID=abc123",
    );

    expect(result).toHaveLength(3);
  });

  it("returns empty on non-ok response", async () => {
    process.env.EXCHANGE_RATE_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
      }),
    );

    const result = await fetchMarketRates();
    expect(result).toEqual([]);
  });

  it("returns empty on invalid JSON", async () => {
    process.env.EXCHANGE_RATE_API_KEY = "test-key";
    vi.stubGlobal("fetch", mockFetchOk("not-json"));

    const result = await fetchMarketRates();
    expect(result).toEqual([]);
  });

  it("returns empty on fetch error", async () => {
    process.env.EXCHANGE_RATE_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const result = await fetchMarketRates();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// fetchCustomsRates
// ---------------------------------------------------------------------------

describe("fetchCustomsRates", () => {
  it("returns UNI-PASS data as primary source with JPY x100", async () => {
    mockedCustomsFetch.mockResolvedValue([
      {
        crryCd: "USD",
        crryNm: "미국 달러",
        xchr: "1340",
        aplcBgnDt: "20260401",
        aplcEndDt: "20260415",
        rtTpCd: "1",
      },
      {
        crryCd: "JPY",
        crryNm: "일본 엔",
        xchr: "9.2",
        aplcBgnDt: "20260401",
        aplcEndDt: "20260415",
        rtTpCd: "1",
      },
    ]);

    const result = await fetchCustomsRates();

    expect(result).toHaveLength(2);

    const usd = result.find((r) => r.currency === "USD");
    expect(usd!.rate).toBe(1340);
    expect(usd!.source).toBe("customs-unipass");

    // JPY should be multiplied by 100
    const jpy = result.find((r) => r.currency === "JPY");
    expect(jpy!.rate).toBeCloseTo(920, 1);
  });

  it("falls back to 공공데이터포털 when UNI-PASS returns empty", async () => {
    mockedCustomsFetch.mockResolvedValue([]);
    process.env.GOV_SERVICE_KEY = "gov-test-key";

    const govResponse = {
      response: {
        body: {
          items: {
            item: [
              { crryCd: "USD", trifFxrt: "1345" },
              { crryCd: "EUR", trifFxrt: "1465" },
            ],
          },
        },
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(govResponse),
        headers: new Headers(),
      }),
    );

    const result = await fetchCustomsRates();

    expect(result).toHaveLength(2);
    expect(result[0].source).toBe("customs-gov");
    expect(result[0].rate).toBe(1345);
  });

  it("returns empty when both UNI-PASS and gov key are unavailable", async () => {
    mockedCustomsFetch.mockResolvedValue([]);
    delete process.env.GOV_SERVICE_KEY;

    const result = await fetchCustomsRates();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Cache TTL logic
// ---------------------------------------------------------------------------

describe("cache TTL", () => {
  it("caches market rates and reuses within TTL", async () => {
    process.env.EXCHANGE_RATE_API_KEY = "test-key";
    const mockFn = mockFetchOk(SAMPLE_KOREAEXIM_RESPONSE);
    vi.stubGlobal("fetch", mockFn);

    // First call -- fetches from API
    const first = await getExchangeRate("USD", "market");
    expect(first).toBeDefined();
    expect(first!.rate).toBe(1350.5);
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Second call -- should come from cache
    const second = await getExchangeRate("EUR", "market");
    expect(second).toBeDefined();
    expect(second!.rate).toBe(1470.2);
    // No additional fetch calls
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("re-fetches after market TTL expires", async () => {
    process.env.EXCHANGE_RATE_API_KEY = "test-key";
    const mockFn = mockFetchOk(SAMPLE_KOREAEXIM_RESPONSE);
    vi.stubGlobal("fetch", mockFn);

    // Prime cache
    await getExchangeRate("USD", "market");
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Advance time past 1 hour TTL
    vi.useFakeTimers();
    vi.advanceTimersByTime(61 * 60 * 1000);

    await getExchangeRate("USD", "market");
    expect(mockFn).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("returns stale cache when API fails after TTL", async () => {
    process.env.EXCHANGE_RATE_API_KEY = "test-key";

    // First: successful fetch
    vi.stubGlobal("fetch", mockFetchOk(SAMPLE_KOREAEXIM_RESPONSE));
    const first = await getExchangeRate("USD", "market");
    expect(first!.rate).toBe(1350.5);

    // Expire cache
    vi.useFakeTimers();
    vi.advanceTimersByTime(61 * 60 * 1000);

    // Now fetch fails
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error")),
    );

    const stale = await getExchangeRate("USD", "market");
    expect(stale).toBeDefined();
    expect(stale!.rate).toBe(1350.5); // stale cached value

    vi.useRealTimers();
  });

  it("caches customs rates with 6-hour TTL", async () => {
    mockedCustomsFetch.mockResolvedValue([
      {
        crryCd: "USD",
        crryNm: "미국 달러",
        xchr: "1340",
        aplcBgnDt: "20260401",
        aplcEndDt: "20260415",
        rtTpCd: "1",
      },
    ]);

    // First call
    const first = await getExchangeRate("USD", "customs");
    expect(first).toBeDefined();
    expect(first!.rate).toBe(1340);
    expect(mockedCustomsFetch).toHaveBeenCalledTimes(1);

    // Within TTL -- no additional call
    const second = await getExchangeRate("USD", "customs");
    expect(second!.rate).toBe(1340);
    expect(mockedCustomsFetch).toHaveBeenCalledTimes(1);

    // Advance past 6-hour customs TTL
    vi.useFakeTimers();
    vi.advanceTimersByTime(6 * 60 * 60 * 1000 + 1000);

    await getExchangeRate("USD", "customs");
    expect(mockedCustomsFetch).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// getExchangeRate
// ---------------------------------------------------------------------------

describe("getExchangeRate", () => {
  it("returns null for unknown currency", async () => {
    process.env.EXCHANGE_RATE_API_KEY = "test-key";
    vi.stubGlobal("fetch", mockFetchOk(SAMPLE_KOREAEXIM_RESPONSE));

    const result = await getExchangeRate("BRL", "market");
    expect(result).toBeNull();
  });

  it("defaults to market type", async () => {
    process.env.EXCHANGE_RATE_API_KEY = "test-key";
    vi.stubGlobal("fetch", mockFetchOk(SAMPLE_KOREAEXIM_RESPONSE));

    const result = await getExchangeRate("USD");
    expect(result).toBeDefined();
    expect(result!.source).toBe("api");
  });

  it("is case-insensitive for currency", async () => {
    process.env.EXCHANGE_RATE_API_KEY = "test-key";
    vi.stubGlobal("fetch", mockFetchOk(SAMPLE_KOREAEXIM_RESPONSE));

    const result = await getExchangeRate("usd");
    expect(result).toBeDefined();
    expect(result!.currency).toBe("USD");
  });
});

// ---------------------------------------------------------------------------
// listExchangeRates
// ---------------------------------------------------------------------------

describe("listExchangeRates", () => {
  it("returns both market and customs rates", async () => {
    process.env.EXCHANGE_RATE_API_KEY = "test-key";
    vi.stubGlobal("fetch", mockFetchOk(SAMPLE_KOREAEXIM_RESPONSE));

    mockedCustomsFetch.mockResolvedValue([
      {
        crryCd: "USD",
        crryNm: "미국 달러",
        xchr: "1340",
        aplcBgnDt: "20260401",
        aplcEndDt: "20260415",
        rtTpCd: "1",
      },
    ]);

    const result = await listExchangeRates();

    expect(result.market).toHaveLength(3);
    expect(result.customs).toHaveLength(1);
    expect(result.market[0].source).toBe("api");
    expect(result.customs[0].source).toBe("customs-unipass");
  });

  it("returns empty arrays when no API keys set", async () => {
    delete process.env.EXCHANGE_RATE_API_KEY;
    delete process.env.GOV_SERVICE_KEY;
    mockedCustomsFetch.mockResolvedValue([]);

    const result = await listExchangeRates();
    expect(result.market).toEqual([]);
    expect(result.customs).toEqual([]);
  });
});
