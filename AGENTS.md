# AGENTS.md -- astrosECOUNT

> ECOUNT ERP Open API MCP Server
> TypeScript (ESM, strict) | Node >= 18 | MCP SDK v1.27.1 | Zod v3.25 | Vitest

## Project Identity

ECOUNT ERP Open API MCP Server -- TypeScript (ESM, strict) | Node >= 18.
Wraps ECOUNT ERP Open API + Internal Web API for LLM access via MCP protocol.

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

### Architecture Decisions (`docs/design-docs/`)

| File | Purpose |
|------|---------|
| [docs/design-docs/index.md](docs/design-docs/index.md) | Design docs index |
| [docs/design-docs/layer-rules.md](docs/design-docs/layer-rules.md) | Import directions, forbidden patterns |
| [docs/design-docs/core-beliefs.md](docs/design-docs/core-beliefs.md) | Agent-first operating principles |

### Execution & Specs

| Directory | Purpose |
|-----------|---------|
| `docs/exec-plans/active/` | In-progress execution plans |
| `docs/exec-plans/completed/` | Completed execution plans |
| [docs/exec-plans/tech-debt-tracker.md](docs/exec-plans/tech-debt-tracker.md) | Known technical debt items |
| `docs/product-specs/` | Product specifications and feature requirements |
| `docs/references/` | External references (LLM docs, design system refs) |
| [docs/generated/db-schema.md](docs/generated/db-schema.md) | ERP entity map (no local DB) |

## Agent Operating Rules

1. **Never throw from tool handlers** -- always return `handleToolError(error)`
2. **Layer direction**: Entry -> Tools -> Client -> Utils -> Config (no upward imports)
3. **Tools never import other tools** -- shared logic goes to utils/ or client/
4. **All logs to stderr** -- stdout is reserved for MCP JSON-RPC
5. **Zod validates all inputs** -- no raw `process.env` outside config.ts
6. **Test every change** -- `npm test` before committing
7. **Read before writing** -- consult docs/ for domain context before making changes
