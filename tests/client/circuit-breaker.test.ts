import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CircuitBreaker, CircuitBreakerOpen } from "../../src/client/circuit-breaker.js";

describe("CircuitBreaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("should start in CLOSED state", () => {
      const cb = new CircuitBreaker();
      expect(cb.getState()).toBe("CLOSED");
    });

    it("should allow calls in CLOSED state", async () => {
      const cb = new CircuitBreaker();
      const result = await cb.call(async () => "ok");
      expect(result).toBe("ok");
    });
  });

  describe("failure threshold", () => {
    it("should open after 3 consecutive failures (default)", async () => {
      const cb = new CircuitBreaker();

      // 3 consecutive failures
      for (let i = 0; i < 3; i++) {
        await expect(cb.call(async () => { throw new Error("fail"); })).rejects.toThrow("fail");
      }

      expect(cb.getState()).toBe("OPEN");
    });

    it("should reset failure count on success", async () => {
      const cb = new CircuitBreaker();

      // 2 failures
      await expect(cb.call(async () => { throw new Error("fail"); })).rejects.toThrow();
      await expect(cb.call(async () => { throw new Error("fail"); })).rejects.toThrow();

      // 1 success resets counter
      await cb.call(async () => "ok");

      // 2 more failures should NOT open (counter was reset)
      await expect(cb.call(async () => { throw new Error("fail"); })).rejects.toThrow();
      await expect(cb.call(async () => { throw new Error("fail"); })).rejects.toThrow();

      expect(cb.getState()).toBe("CLOSED");
    });

    it("should respect custom failure threshold", async () => {
      const cb = new CircuitBreaker({ failureThreshold: 5 });

      for (let i = 0; i < 4; i++) {
        await expect(cb.call(async () => { throw new Error("fail"); })).rejects.toThrow();
      }

      expect(cb.getState()).toBe("CLOSED"); // Still closed at 4

      await expect(cb.call(async () => { throw new Error("fail"); })).rejects.toThrow();
      expect(cb.getState()).toBe("OPEN"); // Opens at 5
    });
  });

  describe("OPEN state", () => {
    it("should reject calls immediately when OPEN", async () => {
      const cb = new CircuitBreaker();

      // Trip the breaker
      for (let i = 0; i < 3; i++) {
        await expect(cb.call(async () => { throw new Error("fail"); })).rejects.toThrow();
      }

      // Next call should throw CircuitBreakerOpen, not execute the function
      const fn = vi.fn(async () => "should not run");
      await expect(cb.call(fn)).rejects.toThrow(CircuitBreakerOpen);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("HALF_OPEN state (recovery)", () => {
    it("should transition to HALF_OPEN after reset timeout (30s default)", async () => {
      const cb = new CircuitBreaker();

      // Trip the breaker
      for (let i = 0; i < 3; i++) {
        await expect(cb.call(async () => { throw new Error("fail"); })).rejects.toThrow();
      }
      expect(cb.getState()).toBe("OPEN");

      // Advance 30 seconds
      vi.advanceTimersByTime(30_000);

      expect(cb.getState()).toBe("HALF_OPEN");
    });

    it("should close on successful call in HALF_OPEN", async () => {
      const cb = new CircuitBreaker();

      // Trip → wait → half-open
      for (let i = 0; i < 3; i++) {
        await expect(cb.call(async () => { throw new Error("fail"); })).rejects.toThrow();
      }
      vi.advanceTimersByTime(30_000);

      // Successful call in HALF_OPEN → CLOSED
      const result = await cb.call(async () => "recovered");
      expect(result).toBe("recovered");
      expect(cb.getState()).toBe("CLOSED");
    });

    it("should re-open on failure in HALF_OPEN", async () => {
      const cb = new CircuitBreaker();

      // Trip → wait → half-open
      for (let i = 0; i < 3; i++) {
        await expect(cb.call(async () => { throw new Error("fail"); })).rejects.toThrow();
      }
      vi.advanceTimersByTime(30_000);
      expect(cb.getState()).toBe("HALF_OPEN");

      // Failure in HALF_OPEN → back to OPEN
      await expect(cb.call(async () => { throw new Error("still broken"); })).rejects.toThrow("still broken");
      expect(cb.getState()).toBe("OPEN");
    });

    it("should respect custom reset timeout", async () => {
      const cb = new CircuitBreaker({ resetTimeoutMs: 60_000 });

      for (let i = 0; i < 3; i++) {
        await expect(cb.call(async () => { throw new Error("fail"); })).rejects.toThrow();
      }

      // 30 seconds is not enough
      vi.advanceTimersByTime(30_000);
      expect(cb.getState()).toBe("OPEN");

      // 60 seconds is enough
      vi.advanceTimersByTime(30_000);
      expect(cb.getState()).toBe("HALF_OPEN");
    });
  });

  describe("getStatus", () => {
    it("should report failure count and state", async () => {
      const cb = new CircuitBreaker();

      await expect(cb.call(async () => { throw new Error("fail"); })).rejects.toThrow();

      const status = cb.getStatus();
      expect(status.state).toBe("CLOSED");
      expect(status.failureCount).toBe(1);
      expect(status.lastFailureTime).toBeTruthy();
    });
  });

  describe("onStateChange callback", () => {
    it("should fire callback on state transitions", async () => {
      const onStateChange = vi.fn();
      const cb = new CircuitBreaker({ onStateChange });

      // CLOSED → OPEN
      for (let i = 0; i < 3; i++) {
        await expect(cb.call(async () => { throw new Error("fail"); })).rejects.toThrow();
      }
      expect(onStateChange).toHaveBeenCalledWith("CLOSED", "OPEN");

      // OPEN → HALF_OPEN
      vi.advanceTimersByTime(30_000);
      // State check triggers transition
      cb.getState();
      expect(onStateChange).toHaveBeenCalledWith("OPEN", "HALF_OPEN");

      // HALF_OPEN → CLOSED
      await cb.call(async () => "ok");
      expect(onStateChange).toHaveBeenCalledWith("HALF_OPEN", "CLOSED");
    });
  });
});
