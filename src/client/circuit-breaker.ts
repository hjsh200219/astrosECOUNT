import { logger } from "../utils/logger.js";
import { CircuitBreakerOpen } from "../utils/error-handler.js";
import { CIRCUIT_BREAKER_RESET_MS } from "../config.js";

export { CircuitBreakerOpen };

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening (default: 3) */
  failureThreshold?: number;
  /** Time in ms to wait before transitioning OPEN → HALF_OPEN (default: 30000) */
  resetTimeoutMs?: number;
  /** Callback fired on state transitions */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

/**
 * Circuit Breaker pattern for ECOUNT internal API calls.
 *
 * - CLOSED: Normal operation. Failures increment counter.
 * - OPEN: All calls rejected immediately. After resetTimeout, transitions to HALF_OPEN.
 * - HALF_OPEN: One trial call allowed. Success → CLOSED, failure → OPEN.
 */
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private openedAt: number | null = null;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly onStateChange?: (from: CircuitState, to: CircuitState) => void;

  constructor(options?: CircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold ?? 3;
    this.resetTimeoutMs = options?.resetTimeoutMs ?? CIRCUIT_BREAKER_RESET_MS;
    this.onStateChange = options?.onStateChange;
  }

  /**
   * Execute a function through the circuit breaker.
   * Throws CircuitBreakerOpen if the circuit is OPEN.
   */
  async call<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === "OPEN") {
      throw new CircuitBreakerOpen();
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get the current state, applying time-based transitions.
   */
  getState(): CircuitState {
    if (this.state === "OPEN" && this.openedAt) {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.resetTimeoutMs) {
        this.transitionTo("HALF_OPEN");
      }
    }
    return this.state;
  }

  getStatus(): {
    state: CircuitState;
    failureCount: number;
    lastFailureTime: number | null;
  } {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === "HALF_OPEN") {
      this.transitionTo("CLOSED");
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "HALF_OPEN") {
      // Any failure in HALF_OPEN → back to OPEN
      this.transitionTo("OPEN");
    } else if (this.failureCount >= this.failureThreshold) {
      this.transitionTo("OPEN");
    }
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    if (oldState === newState) return;

    logger.info("CircuitBreaker 상태 전환", { from: oldState, to: newState });
    this.state = newState;

    if (newState === "OPEN") {
      this.openedAt = Date.now();
    } else if (newState === "CLOSED") {
      this.failureCount = 0;
      this.openedAt = null;
    }

    this.onStateChange?.(oldState, newState);
  }
}
