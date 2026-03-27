# agent.md -- astrosECOUNT

> ECOUNT ERP Open API MCP Server
> TypeScript (ESM, strict) | Node >= 18 | MCP SDK v1.27.1 | Zod v3.25 | Vitest

## Quick Reference

```
src/index.ts          Entry point (stdio transport)
src/server.ts         McpServer factory (config -> client -> tools)
src/config.ts         Env validation (zod): ECOUNT_COM_CODE, USER_ID, API_CERT_KEY, ZONE
src/client/           HTTP client, session managers, circuit breaker, KeyPack encoder
src/tools/            22 MCP tool modules (Category A: ERP CRUD, B: standalone, B+: utilities)
src/utils/            Error handling, response formatting, logger, persistence
tests/                Vitest unit tests (mirrors src/ 1:1)
docs/                 Domain knowledge, API docs, architecture
```

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

| Document | Contents |
|----------|----------|
| [AGENTS.md](AGENTS.md) | Agent entry point, full docs/ map |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Domain map, layers, dependency graph, tech stack |
| [docs/DESIGN.md](docs/DESIGN.md) | Coding patterns, naming, error hierarchy |
| [docs/SECURITY.md](docs/SECURITY.md) | Auth, secrets, session security |
| [docs/RELIABILITY.md](docs/RELIABILITY.md) | Session reliability, circuit breaker, error contract |
| [docs/QUALITY_SCORE.md](docs/QUALITY_SCORE.md) | Quality grades per domain |
| [docs/PRODUCT_SENSE.md](docs/PRODUCT_SENSE.md) | Product principles, user personas |
| [docs/PLANS.md](docs/PLANS.md) | Exec plans index |

## Domain Knowledge

| Document | Contents |
|----------|----------|
| [docs/README.md](docs/README.md) | Documentation index |
| [docs/01-data-catalog.md](docs/01-data-catalog.md) | Data catalog (products, inventory, orders, accounting) |
| [docs/02-entity-relationship.md](docs/02-entity-relationship.md) | ERD, entity relationships, code systems |
| [docs/03-business-workflow.md](docs/03-business-workflow.md) | End-to-end workflow: purchase -> logistics -> inventory -> sales -> accounting |
| [docs/04-tool-reference.md](docs/04-tool-reference.md) | MCP tool reference + internal API endpoints |
| [docs/05-api-coverage-gap.md](docs/05-api-coverage-gap.md) | API coverage gap analysis (~80% coverage) |
| [docs/07-internal-api-reverse-engineering.md](docs/07-internal-api-reverse-engineering.md) | Internal Web API reverse engineering (__$KeyPack protocol) |

## Architecture Decisions

| Document | Contents |
|----------|----------|
| [docs/design-docs/layer-rules.md](docs/design-docs/layer-rules.md) | Import directions, forbidden patterns |
| [docs/design-docs/core-beliefs.md](docs/design-docs/core-beliefs.md) | Agent-first operating principles |
| [docs/exec-plans/tech-debt-tracker.md](docs/exec-plans/tech-debt-tracker.md) | Known tech debt items |
