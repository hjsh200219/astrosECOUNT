import { describe, it, expect, beforeEach } from "vitest";
import { checkHealth, type HealthReport, type SubsystemHealth } from "../../src/tools/health-check.js";
import { setExchangeRate } from "../../src/tools/exchange-rate.js";

describe("checkHealth", () => {
  beforeEach(() => {
    // Seed manual overrides so exchange rate check passes
    setExchangeRate("USD", 1350, "manual");
    setExchangeRate("BRL", 270, "manual");
    setExchangeRate("EUR", 1470, "manual");
  });

  it("should return a HealthReport with all required subsystems", async () => {
    const report = await checkHealth();
    expect(report).toHaveProperty("overall");
    expect(report).toHaveProperty("subsystems");
    expect(report).toHaveProperty("checkedAt");
    expect(Array.isArray(report.subsystems)).toBe(true);
  });

  it("should include openApi, internalApi, circuitBreaker, exchangeRates, shipments subsystems", async () => {
    const report = await checkHealth();
    const names = report.subsystems.map((s) => s.name);
    expect(names).toContain("openApi");
    expect(names).toContain("internalApi");
    expect(names).toContain("circuitBreaker");
    expect(names).toContain("exchangeRates");
    expect(names).toContain("shipments");
  });

  it("each subsystem should have name, status, message, checkedAt", async () => {
    const report = await checkHealth();
    for (const sub of report.subsystems) {
      expect(sub).toHaveProperty("name");
      expect(sub).toHaveProperty("status");
      expect(sub).toHaveProperty("message");
      expect(sub).toHaveProperty("checkedAt");
      expect(["ok", "degraded", "down"]).toContain(sub.status);
    }
  });

  it("overall should be 'healthy' when all subsystems are ok", async () => {
    const report = await checkHealth();
    const allOk = report.subsystems.every((s) => s.status === "ok");
    if (allOk) {
      expect(report.overall).toBe("healthy");
    }
  });

  it("overall should be 'degraded' when any subsystem is degraded and none is down", async () => {
    // exchange rates always exist (defaulted), shipments map starts empty → degraded
    const report = await checkHealth();
    const hasDegraded = report.subsystems.some((s) => s.status === "degraded");
    const hasDown = report.subsystems.some((s) => s.status === "down");
    if (hasDegraded && !hasDown) {
      expect(report.overall).toBe("degraded");
    }
  });

  it("overall should be 'unhealthy' when any subsystem is down", async () => {
    const report = await checkHealth();
    const hasDown = report.subsystems.some((s) => s.status === "down");
    if (hasDown) {
      expect(report.overall).toBe("unhealthy");
    }
  });

  it("checkedAt on HealthReport should be a valid ISO string", async () => {
    const report = await checkHealth();
    expect(report.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("checkedAt on each SubsystemHealth should be a valid ISO string", async () => {
    const report = await checkHealth();
    for (const sub of report.subsystems) {
      expect(sub.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it("exchangeRates subsystem is 'ok' because default rates exist", async () => {
    const report = await checkHealth();
    const er = report.subsystems.find((s) => s.name === "exchangeRates");
    expect(er).toBeDefined();
    expect(er!.status).toBe("ok");
  });

  it("shipments subsystem is 'degraded' when no shipments registered", async () => {
    const report = await checkHealth();
    const sh = report.subsystems.find((s) => s.name === "shipments");
    expect(sh).toBeDefined();
    // SHIPMENTS map starts empty in test environment
    expect(sh!.status).toBe("degraded");
    expect(sh!.message).toBeTruthy();
  });

  it("openApi subsystem should have a message about connectivity", async () => {
    const report = await checkHealth();
    const oa = report.subsystems.find((s) => s.name === "openApi");
    expect(oa).toBeDefined();
    expect(typeof oa!.message).toBe("string");
    expect(oa!.message.length).toBeGreaterThan(0);
  });

  it("circuitBreaker subsystem status should be ok when no failures recorded", async () => {
    const report = await checkHealth();
    const cb = report.subsystems.find((s) => s.name === "circuitBreaker");
    expect(cb).toBeDefined();
    expect(cb!.status).toBe("ok");
  });
});

describe("registerHealthCheckTools", () => {
  it("should register ecount_health_check tool without throwing", async () => {
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { registerHealthCheckTools } = await import("../../src/tools/health-check.js");
    const server = new McpServer({ name: "test", version: "0.1" });
    expect(() => registerHealthCheckTools(server)).not.toThrow();
  });
});
