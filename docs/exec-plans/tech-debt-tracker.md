# Tech Debt Tracker -- astrosECOUNT

> Known technical debt items, prioritized by impact.

## Active Tech Debt

### P1 -- High Impact

| ID | Area | Description | Impact | Effort |
|----|------|-------------|--------|--------|
| TD-001 | Utils / persistence | `loadFromFile` returns null on error (silent failure); write failures not propagated | Data loss risk | S |
| TD-002 | Integration tests | Only 1 integration test file (`server.test.ts`); no E2E against mock API | Low confidence in API integration | L |

### P2 -- Medium Impact

| ID | Area | Description | Impact | Effort |
|----|------|-------------|--------|--------|
| TD-003 | Utils / logger | No unit tests for log level filtering; LOG_LEVEL env var read directly | Logger bugs undetected | S |
| TD-004 | Category B tools | Some tools define in-memory data structures without Zod validation (e.g., business-rules) | Invalid data accepted | M |
| TD-005 | Coverage metrics | Vitest V8 coverage configured but not enforced in CI | Coverage regression risk | S |

### P3 -- Low Impact

| ID | Area | Description | Impact | Effort |
|----|------|-------------|--------|--------|
| TD-006 | Logger | Relies on `process.stderr.write` without abstraction; harder to test | Test friction | S |
| TD-007 | Utils / error-handler | Cross-layer import from client/circuit-breaker (exception to layer rules) | Architectural purity | M |
| TD-008 | API coverage | V3 Legacy endpoints (supplier lists, production intake) not covered (~20% gap) | Feature gap | XL |

## Resolved Tech Debt

| ID | Area | Resolution | Date |
|----|------|-----------|------|
| *(none yet)* | - | - | - |

## Effort Scale

| Size | Estimate |
|------|----------|
| S | < 2 hours |
| M | 2-8 hours |
| L | 1-3 days |
| XL | > 3 days |
