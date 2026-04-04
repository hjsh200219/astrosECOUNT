# Tech Debt Tracker -- astrosECOUNT

> Known technical debt items, prioritized by impact.

## Active Tech Debt

### P1 -- High Impact

| ID | Area | Description | Impact | Effort |
|----|------|-------------|--------|--------|
| TD-001 | Utils / persistence | `loadFromFile` returns null on error (silent failure); write failures not propagated | Data loss risk | S |
| TD-002 | Integration tests | Only 1 integration test file (`server.test.ts`); no E2E against mock API | Low confidence in API integration | L |
| TD-009 | Tools (5 files) | Tool-to-tool imports in financial-statements, stale-shipments, logistics-kpi, daily-report, health-check -- Core Invariant #5 violated | Architecture drift | M |

### P2 -- Medium Impact

| ID | Area | Description | Impact | Effort |
|----|------|-------------|--------|--------|
| TD-003 | Utils / logger | No unit tests for log level filtering; LOG_LEVEL env var read directly | Logger bugs undetected | S |
| TD-004 | Category B tools | Some tools define in-memory data structures without Zod validation (e.g., business-rules) | Invalid data accepted | M |
| TD-005 | Coverage metrics | Vitest V8 coverage configured but not enforced in CI | Coverage regression risk | S |
| TD-010 | ~~Services~~ | ~~`process.env` direct access in exchange-rate.ts and unipass/client.ts~~ | ~~해소 — 서비스 제거~~ | - |
| TD-011 | ~~Services / unipass~~ | ~~12 service modules but only client.test.ts exists~~ | ~~해소 — korea-public-data-mcp 이전~~ | - |

### P3 -- Low Impact

| ID | Area | Description | Impact | Effort |
|----|------|-------------|--------|--------|
| TD-006 | Logger | Relies on `process.stderr.write` without abstraction; harder to test | Test friction | S |
| TD-007 | Utils / error-handler | Cross-layer import from client/circuit-breaker (exception to layer rules) | Architectural purity | M |
| TD-008 | API coverage | V3 Legacy endpoints (supplier lists, production intake) not covered (~20% gap) | Feature gap | XL |
| TD-012 | Utils / renderers | dashboard-renderers.ts test missing; logger.ts test missing | Test gap | S |
| TD-013 | Tools | board.ts test file missing | Test gap | S |

## Resolved Tech Debt

| ID | Area | Resolution | Date |
|----|------|-----------|------|
| TD-010 | Services | exchange-rate, unipass 서비스 제거 (korea-public-data-mcp 이전) | 2026-04-05 |
| TD-011 | Services / unipass | 12개 모듈 전체 제거 (korea-public-data-mcp 이전) | 2026-04-05 |

## Effort Scale

| Size | Estimate |
|------|----------|
| S | < 2 hours |
| M | 2-8 hours |
| L | 1-3 days |
| XL | > 3 days |
