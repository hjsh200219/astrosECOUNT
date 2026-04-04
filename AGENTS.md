# AGENTS.md -- astrosECOUNT

> ECOUNT ERP Open API MCP Server
> TypeScript (ESM, strict) | Node >= 18 | MCP SDK v1.28 | Zod v4 | Vitest v4

## Project Identity

ECOUNT ERP Open API MCP Server -- TypeScript (ESM, strict) | Node >= 18.
Wraps ECOUNT ERP Open API + Internal Web API for LLM access via MCP protocol.

## Quick Reference

```
src/index.ts          Entry point (stdio transport)
src/server.ts         McpServer factory (config -> client -> tools)
src/config.ts         Env validation (zod): ECOUNT_COM_CODE, USER_ID, API_CERT_KEY, ZONE
src/client/           HTTP client, session managers, circuit breaker, KeyPack encoder
src/tools/            40 MCP tool modules (Category A: ERP CRUD, B: standalone, B+: utilities)
src/utils/            Error handling, response formatting, renderers, logger, stores
src/types/            Type declarations (popbill)
tests/                Vitest unit tests (mirrors src/ 1:1)
docs/                 Domain knowledge, API docs, architecture
```

## External MCP — korea-public-data-mcp

아래 기능은 이 프로젝트에서 **의도적으로 제거**되었으며, 별도의 `korea-public-data-mcp` 서버에서 제공합니다.
환율 조회, 관세청 유니패스, 축산물 이력추적 등이 필요하면 **반드시 korea-public-data-mcp를 호출**하세요.

| 기능 | 도구 예시 | MCP 서버 |
|------|----------|---------|
| 관세환율 / 시장환율 조회 | `get_customs_exchange_rate`, `get_exchange_rate` | `korea-public-data-mcp` |
| 관세청 유니패스 (통관/화물/HS부호 등) | `unipass_*` (51개 API) | `korea-public-data-mcp` |
| 축산물 이력추적 (MAFRA) | `search_meat_trace` | `korea-public-data-mcp` |

설치 가이드: [docs/howto/10-public-data-setup-guide.md](docs/howto/10-public-data-setup-guide.md)

## Core Invariants

1. **Never throw from tool handlers** -- always catch and return `handleToolError(error)`
2. **Zod validates all inputs** -- tool params, env config; no raw `process.env` outside config.ts
3. **Session auto-management** -- login on first call, auto-retry on expiry, promise deduplication
4. **Layer direction: Entry -> Tools -> Client -> Utils -> Config** -- no upward imports
5. **Tools never import other tools** -- shared logic goes to utils/ or client/
6. **Dual session isolation** -- Open API and Internal API failures are independent
7. **Circuit breaker on Internal API** -- 3 failures -> OPEN (30s reset)
8. **All logs to stderr** -- stdout is reserved for MCP JSON-RPC protocol

## Quick Commands

```bash
npm run build        # TypeScript compile
npm run dev          # Watch mode (tsx)
npm start            # Run built server
npm test             # Vitest (requires npm install first)
npm run lint         # tsc --noEmit
npm run inspector    # MCP Inspector debugging
```

## Adding a New Tool

1. Create `src/tools/{name}.ts` with `register{Name}Tools(server, client?)`
2. Import + call in `src/tools/index.ts`
3. Create `tests/tools/{name}.test.ts`
4. Category A needs EcountClient; Category B is standalone

## Documentation Map

### Root Files

| File | Purpose |
|------|---------|
| [AGENTS.md](AGENTS.md) / `CLAUDE.md` | Agent entry point, core invariants, commands |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Domain map, layers, dependency graph, data flow, tech stack |

### Harness Docs (`docs/`)

| File | Purpose |
|------|---------|
| [docs/DESIGN.md](docs/DESIGN.md) | Coding patterns, naming conventions, error hierarchy |
| [docs/FRONTEND.md](docs/FRONTEND.md) | N/A -- backend MCP server (no frontend) |
| [docs/PRODUCT_SENSE.md](docs/PRODUCT_SENSE.md) | Product principles, user personas, domain context |
| [docs/QUALITY_SCORE.md](docs/QUALITY_SCORE.md) | Quality grades per domain, test coverage, improvement paths |
| [docs/SECURITY.md](docs/SECURITY.md) | Authentication, secrets management, threat model |
| [docs/RELIABILITY.md](docs/RELIABILITY.md) | Session reliability, circuit breaker, error contract |
| [docs/PLANS.md](docs/PLANS.md) | Plans index linking to exec-plans/ |

### Domain Knowledge (`docs/howto/`)

| File | Purpose |
|------|---------|
| [docs/README.md](docs/README.md) | Documentation index (full map) |
| [docs/howto/00-setup-operations.md](docs/howto/00-setup-operations.md) | Environment setup, authentication, session management |
| [docs/howto/01-data-catalog.md](docs/howto/01-data-catalog.md) | Data catalog (products, inventory, orders, accounting) |
| [docs/howto/02-entity-relationship.md](docs/howto/02-entity-relationship.md) | ERD, entity relationships, code systems |
| [docs/howto/03-business-workflow.md](docs/howto/03-business-workflow.md) | End-to-end: purchase -> logistics -> inventory -> sales -> accounting |
| [docs/howto/04-tool-reference.md](docs/howto/04-tool-reference.md) | MCP tool reference + internal API endpoints |
| [docs/howto/05-api-coverage-gap.md](docs/howto/05-api-coverage-gap.md) | API coverage gap analysis (~80% coverage) |
| [docs/howto/07-internal-api-reverse-engineering.md](docs/howto/07-internal-api-reverse-engineering.md) | Internal Web API reverse engineering (__$KeyPack) |
| [docs/howto/08-v3-mcp-coverage.md](docs/howto/08-v3-mcp-coverage.md) | V3 system MCP implementation coverage |
| [docs/howto/09-v5-mcp-coverage.html](docs/howto/09-v5-mcp-coverage.html) | V5 system MCP implementation coverage |

### Architecture Decisions (`docs/design-docs/`)

| File | Purpose |
|------|---------|
| [docs/design-docs/index.md](docs/design-docs/index.md) | Design docs index |
| [docs/design-docs/layer-rules.md](docs/design-docs/layer-rules.md) | Import directions, forbidden patterns |
| [docs/design-docs/core-beliefs.md](docs/design-docs/core-beliefs.md) | Agent-first operating principles |

### Harness Engineering (`docs/harness/`)

| File | Purpose |
|------|---------|
| [docs/harness/principles.md](docs/harness/principles.md) | 12 harness principles, scoring criteria, checklists |
| [docs/harness/maturity-framework.md](docs/harness/maturity-framework.md) | L1-L5 maturity tiers, 4-dimension weighted scoring |
| [docs/harness/fix-catalog.md](docs/harness/fix-catalog.md) | Principle × score range → remediation actions |
| [docs/harness/gc-history.md](docs/harness/gc-history.md) | GC run history, maturity trend tracking |

### Execution & Specs

| Directory | Purpose |
|-----------|---------|
| `docs/exec-plans/active/` | In-progress execution plans |
| `docs/exec-plans/completed/` | Completed execution plans |
| [docs/exec-plans/tech-debt-tracker.md](docs/exec-plans/tech-debt-tracker.md) | Known technical debt items |
| `docs/product-specs/` | Product specifications and feature requirements |
| `docs/references/` | External references (LLM docs, design system refs) |
| [docs/generated/db-schema.md](docs/generated/db-schema.md) | ERP entity map (no local DB) |

