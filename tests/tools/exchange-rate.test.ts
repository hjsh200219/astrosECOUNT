import { describe, it, expect, beforeEach } from "vitest";
import {
  getExchangeRate,
  setExchangeRate,
  listExchangeRates,
  calculateKrw,
  validateShipmentRates,
  type ExchangeRate,
  type ShipmentRateCheck,
  type RateValidationResult,
} from "../../src/tools/exchange-rate.js";

describe("getExchangeRate", () => {
  it("should return default USD rate", () => {
    const result = getExchangeRate("USD");
    expect(result).not.toBeNull();
    expect(result!.currency).toBe("USD");
    expect(result!.rate).toBe(1350);
    expect(result!.source).toBe("manual");
  });

  it("should return default BRL rate", () => {
    const result = getExchangeRate("BRL");
    expect(result).not.toBeNull();
    expect(result!.currency).toBe("BRL");
    expect(result!.rate).toBe(270);
  });

  it("should return default EUR rate", () => {
    const result = getExchangeRate("EUR");
    expect(result).not.toBeNull();
    expect(result!.currency).toBe("EUR");
    expect(result!.rate).toBe(1470);
  });

  it("should return null for unknown currency", () => {
    const result = getExchangeRate("XYZ");
    expect(result).toBeNull();
  });

  it("should be case-insensitive for currency lookup", () => {
    const result = getExchangeRate("usd");
    expect(result).not.toBeNull();
    expect(result!.currency).toBe("USD");
  });
});

describe("setExchangeRate", () => {
  it("should set and retrieve a custom rate", () => {
    setExchangeRate("USD", 1400, "api");
    const result = getExchangeRate("USD");
    expect(result).not.toBeNull();
    expect(result!.rate).toBe(1400);
    expect(result!.source).toBe("api");
    // restore
    setExchangeRate("USD", 1350, "manual");
  });

  it("should add a new currency", () => {
    setExchangeRate("JPY", 9);
    const result = getExchangeRate("JPY");
    expect(result).not.toBeNull();
    expect(result!.currency).toBe("JPY");
    expect(result!.rate).toBe(9);
  });

  it("should return the new ExchangeRate object", () => {
    const result = setExchangeRate("EUR", 1500);
    expect(result.currency).toBe("EUR");
    expect(result.rate).toBe(1500);
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // restore
    setExchangeRate("EUR", 1470, "manual");
  });
});

describe("listExchangeRates", () => {
  it("should return at least 3 default rates", () => {
    const rates = listExchangeRates();
    expect(rates.length).toBeGreaterThanOrEqual(3);
  });

  it("should include USD, BRL, EUR", () => {
    const rates = listExchangeRates();
    const currencies = rates.map((r) => r.currency);
    expect(currencies).toContain("USD");
    expect(currencies).toContain("BRL");
    expect(currencies).toContain("EUR");
  });
});

describe("calculateKrw", () => {
  it("should convert USD amount to KRW", () => {
    const result = calculateKrw(100, "USD");
    expect(result).not.toBeNull();
    expect(result!.currency).toBe("USD");
    expect(result!.krw).toBe(100 * result!.rate);
  });

  it("should return null for unknown currency", () => {
    const result = calculateKrw(100, "XYZ");
    expect(result).toBeNull();
  });
});

describe("registerExchangeRateTools", () => {
  it("should register tools without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerExchangeRateTools } = await import("../../src/tools/exchange-rate.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerExchangeRateTools(server)).not.toThrow();
  });
});

describe("validateShipmentRates", () => {
  it("should return 100% coverage when all shipments have known currencies", () => {
    const result = validateShipmentRates([
      { blNumber: "BL001", blDate: "2024-01-15", currency: "USD" },
      { blNumber: "BL002", blDate: "2024-01-16", currency: "EUR" },
      { blNumber: "BL003", blDate: "2024-01-17", currency: "BRL" },
    ]);
    expect(result.coveredCount).toBe(3);
    expect(result.missingCount).toBe(0);
    expect(result.coverageRate).toBe(1);
    expect(result.checks.every((c) => c.hasRate)).toBe(true);
  });

  it("should return hasRate: false for unknown currency", () => {
    const result = validateShipmentRates([
      { blNumber: "BL001", blDate: "2024-02-01", currency: "XYZ" },
    ]);
    expect(result.checks[0].hasRate).toBe(false);
    expect(result.coveredCount).toBe(0);
    expect(result.missingCount).toBe(1);
    expect(result.coverageRate).toBe(0);
  });

  it("should return correct coverage rate for mixed known/unknown currencies", () => {
    const result = validateShipmentRates([
      { blNumber: "BL001", blDate: "2024-03-01", currency: "USD" },
      { blNumber: "BL002", blDate: "2024-03-02", currency: "XYZ" },
      { blNumber: "BL003", blDate: "2024-03-03", currency: "EUR" },
      { blNumber: "BL004", blDate: "2024-03-04", currency: "ABC" },
    ]);
    expect(result.coveredCount).toBe(2);
    expect(result.missingCount).toBe(2);
    expect(result.coverageRate).toBeCloseTo(0.5);
  });

  it("should return 0 coverageRate for empty input (no division by zero)", () => {
    const result = validateShipmentRates([]);
    expect(result.checks).toHaveLength(0);
    expect(result.coveredCount).toBe(0);
    expect(result.missingCount).toBe(0);
    expect(result.coverageRate).toBe(0);
  });

  it("should include currency code in message when rate is missing", () => {
    const result = validateShipmentRates([
      { blNumber: "BL001", blDate: "2024-04-01", currency: "CNY" },
    ]);
    expect(result.checks[0].message).toContain("CNY");
    expect(result.checks[0].hasRate).toBe(false);
  });

  it("should preserve blDate in output check", () => {
    const result = validateShipmentRates([
      { blNumber: "BL999", blDate: "2024-05-20", currency: "USD" },
    ]);
    expect(result.checks[0].blDate).toBe("2024-05-20");
    expect(result.checks[0].blNumber).toBe("BL999");
  });

  it("should include rate value when hasRate is true", () => {
    const result = validateShipmentRates([
      { blNumber: "BL001", blDate: "2024-06-01", currency: "USD" },
    ]);
    expect(result.checks[0].hasRate).toBe(true);
    expect(result.checks[0].rate).toBe(1350);
    expect(result.checks[0].message).toBe("환율 적용 가능");
  });

  it("should register ecount_validate_shipment_rates tool", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerExchangeRateTools } = await import("../../src/tools/exchange-rate.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerExchangeRateTools(server)).not.toThrow();
  });
});
