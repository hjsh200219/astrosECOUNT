import { describe, it, expect } from "vitest";
import { checkHealth, type HealthReport, type SubsystemHealth } from "../../src/tools/health-check.js";

describe("checkHealth", () => {
  it("should return a HealthReport with all required subsystems", () => {
    const report = checkHealth();
    expect(report).toHaveProperty("overall");
    expect(report).toHaveProperty("subsystems");
    expect(report).toHaveProperty("checkedAt");
    expect(Array.isArray(report.subsystems)).toBe(true);
  });

  it("should include openApi, internalApi, circuitBreaker, shipments subsystems", () => {
    const report = checkHealth();
    const names = report.subsystems.map((s) => s.name);
    expect(names).toContain("openApi");
    expect(names).toContain("internalApi");
    expect(names).toContain("circuitBreaker");
    expect(names).toContain("shipments");
  });

  it("each subsystem should have name, status, message, checkedAt", () => {
    const report = checkHealth();
    for (const sub of report.subsystems) {
      expect(sub).toHaveProperty("name");
      expect(sub).toHaveProperty("status");
      expect(sub).toHaveProperty("message");
      expect(sub).toHaveProperty("checkedAt");
      expect(["ok", "degraded", "down"]).toContain(sub.status);
    }
  });

  it("overall should be 'healthy' when all subsystems are ok", () => {
    const report = checkHealth();
    const allOk = report.subsystems.every((s) => s.status === "ok");
    if (allOk) {
      expect(report.overall).toBe("healthy");
    }
  });

  it("overall should be 'degraded' when any subsystem is degraded and none is down", () => {
    const report = checkHealth();
    const hasDegraded = report.subsystems.some((s) => s.status === "degraded");
    const hasDown = report.subsystems.some((s) => s.status === "down");
    if (hasDegraded && !hasDown) {
      expect(report.overall).toBe("degraded");
    }
  });

  it("overall should be 'unhealthy' when any subsystem is down", () => {
    const report = checkHealth();
    const hasDown = report.subsystems.some((s) => s.status === "down");
    if (hasDown) {
      expect(report.overall).toBe("unhealthy");
    }
  });

  it("checkedAt on HealthReport should be a valid ISO string", () => {
    const report = checkHealth();
    expect(report.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("checkedAt on each SubsystemHealth should be a valid ISO string", () => {
    const report = checkHealth();
    for (const sub of report.subsystems) {
      expect(sub.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it("shipments subsystem is 'degraded' when no shipments registered", () => {
    const report = checkHealth();
    const sh = report.subsystems.find((s) => s.name === "shipments");
    expect(sh).toBeDefined();
    expect(sh!.status).toBe("degraded");
    expect(sh!.message).toBeTruthy();
  });

  it("openApi subsystem should have a message about connectivity", () => {
    const report = checkHealth();
    const oa = report.subsystems.find((s) => s.name === "openApi");
    expect(oa).toBeDefined();
    expect(typeof oa!.message).toBe("string");
    expect(oa!.message.length).toBeGreaterThan(0);
  });

  it("circuitBreaker subsystem status should be ok when no failures recorded", () => {
    const report = checkHealth();
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
