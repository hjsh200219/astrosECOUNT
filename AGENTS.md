# AGENTS.md -- astrosECOUNT

> ECOUNT ERP Open API MCP Server
> TypeScript (ESM, strict) | Node >= 18 | MCP SDK v1.28 | Zod v4 | Vitest v4

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

## External MCP

환율, 관세청 유니패스, 축산물 이력추적은 **korea-public-data-mcp** 서버에서 제공합니다.
설치: [docs/howto/10-public-data-setup-guide.md](docs/howto/10-public-data-setup-guide.md)

## Core Invariants

1. **Never throw from tool handlers** -- always catch and return `handleToolError(error)`
2. **Zod validates all inputs** -- tool params, env config; no raw `process.env` outside config.ts
3. **Session auto-management** -- login on first call, auto-retry on expiry, promise deduplication
4. **Layer direction: Entry -> Tools -> Client -> Utils -> Config** -- no upward imports
5. **Tools never import other tools** -- shared logic goes to utils/ or client/
6. **Dual session isolation** -- Open API and Internal API failures are independent
7. **Circuit breaker on Internal API** -- 3 failures -> OPEN (30s reset)
8. **All logs to stderr** -- stdout is reserved for MCP JSON-RPC protocol

## Commands

```bash
npm run build        # TypeScript compile
npm run dev          # Watch mode (tsx)
npm start            # Run built server
npm test             # Vitest
npm run lint         # tsc --noEmit
npm run inspector    # MCP Inspector debugging
```

## Adding a New Tool

1. Create `src/tools/{name}.ts` with `register{Name}Tools(server, client?)`
2. Import + call in `src/tools/index.ts`
3. Create `tests/tools/{name}.test.ts`
4. Category A needs EcountClient; Category B is standalone

## Documentation Map

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Domain map, layers, dependency graph, tech stack |
| [docs/DESIGN.md](docs/DESIGN.md) | Coding patterns, naming, error hierarchy |
| [docs/PRODUCT_SENSE.md](docs/PRODUCT_SENSE.md) | Product principles, user personas |
| [docs/QUALITY_SCORE.md](docs/QUALITY_SCORE.md) | Quality grades, test coverage |
| [docs/SECURITY.md](docs/SECURITY.md) | Auth, secrets, threat model |
| [docs/RELIABILITY.md](docs/RELIABILITY.md) | Session reliability, circuit breaker |
| [docs/PLANS.md](docs/PLANS.md) | Exec plans index |
| [docs/README.md](docs/README.md) | Full documentation index |

### Domain Knowledge (`docs/howto/`)

| File | Purpose |
|------|---------|
| [00-setup-operations](docs/howto/00-setup-operations.md) | Environment setup, auth, session |
| [01-data-catalog](docs/howto/01-data-catalog.md) | Products, inventory, orders, accounting |
| [02-entity-relationship](docs/howto/02-entity-relationship.md) | ERD, code systems |
| [03-business-workflow](docs/howto/03-business-workflow.md) | Purchase → logistics → inventory → sales → accounting |
| [04-tool-reference](docs/howto/04-tool-reference.md) | MCP tool reference + internal API endpoints |
| [05-api-coverage-gap](docs/howto/05-api-coverage-gap.md) | API coverage gap (~80%) |
| [07-internal-api](docs/howto/07-internal-api-reverse-engineering.md) | Internal Web API (__$KeyPack) |

### Architecture & Harness

| File | Purpose |
|------|---------|
| [design-docs/index.md](docs/design-docs/index.md) | Design docs + ADRs index |
| [design-docs/layer-rules.md](docs/design-docs/layer-rules.md) | Import directions, forbidden patterns |
| [design-docs/core-beliefs.md](docs/design-docs/core-beliefs.md) | Agent-first principles |
| [harness/principles.md](docs/harness/principles.md) | 12 harness principles, scoring |
| [harness/maturity-framework.md](docs/harness/maturity-framework.md) | L1-L5 maturity tiers |
| [harness/fix-catalog.md](docs/harness/fix-catalog.md) | Principle → remediation actions |
| [harness/gc-history.md](docs/harness/gc-history.md) | GC run history |

### Execution

| Path | Purpose |
|------|---------|
| `docs/exec-plans/active/` | In-progress plans |
| `docs/exec-plans/completed/` | Completed plans |
| [docs/exec-plans/tech-debt-tracker.md](docs/exec-plans/tech-debt-tracker.md) | Tech debt |
| `docs/product-specs/` | Product specs |
| [docs/generated/db-schema.md](docs/generated/db-schema.md) | ERP entity map |

> Be concise. No filler. Straight to the point. Use fewer words.
