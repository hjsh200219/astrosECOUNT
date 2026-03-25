import { describe, it, expect, beforeEach } from "vitest";
import {
  getExchangeRate,
  setExchangeRate,
  listExchangeRates,
  calculateKrw,
  type ExchangeRate,
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
