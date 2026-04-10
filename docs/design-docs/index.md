# Design Docs Index -- astrosECOUNT

> Architecture decisions and design documents for the ECOUNT ERP MCP Server.

## Documents

| Document | Status | Description |
|----------|--------|-------------|
| [layer-rules.md](layer-rules.md) | Active | Layer dependency rules, import directions, anti-patterns |
| [core-beliefs.md](core-beliefs.md) | Active | Agent-first operating principles and foundational beliefs |

## Architecture Decision Records (ADR)

| ADR | Status | Decision |
|-----|--------|----------|
| [ADR-001](adr/001-dual-api-session-isolation.md) | Accepted | Open API / Internal API 이중 세션 분리 |
| [ADR-002](adr/002-tool-handler-extraction-pattern.md) | Accepted | Tool Handler 추출 패턴 |
| [ADR-003](adr/003-three-stage-inventory-pipeline.md) | Accepted | 3단계 재고 파이프라인 |

ADR 템플릿: [adr/000-template.md](adr/000-template.md)

## How to Add a Design Doc

1. Create a new `.md` file in this directory (or `adr/` for decisions)
2. Add it to the table above
3. Include: Context, Decision, Consequences, Alternatives Considered
