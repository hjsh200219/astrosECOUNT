# AGENTS.md -- astrosECOUNT

> Agent entry point. This file describes how AI agents should navigate and operate in this repo.

## Project Identity

ECOUNT ERP Open API MCP Server -- TypeScript (ESM, strict) | Node >= 18.
Wraps ECOUNT ERP Open API + Internal Web API for LLM access via MCP protocol.

## How to Start

1. Read this file first for orientation
2. Read `agent.md` (symlinked as `CLAUDE.md`) for core invariants and commands
3. Consult docs/ for domain knowledge and architecture decisions

## Documentation Map

| File | Purpose |
|------|---------|
| `agent.md` / `CLAUDE.md` | Core invariants, commands, quick reference (~100 lines) |
| `ARCHITECTURE.md` | Domain map, layers, dependency graph, data flow |
| `docs/ARCHITECTURE.md` | Detailed architecture (domain map, tech stack, data flow) |
| `docs/DESIGN.md` | Design system: coding patterns, naming conventions |
| `docs/FRONTEND.md` | N/A -- this is a backend MCP server (no frontend) |
| `docs/PRODUCT_SENSE.md` | Product principles, user personas, domain context |
| `docs/QUALITY_SCORE.md` | Quality grades per domain, test coverage analysis |
| `docs/QUALITY.md` | Legacy quality report (kept for reference) |
| `docs/SECURITY.md` | Authentication, secrets, session security rules |
| `docs/RELIABILITY.md` | Session reliability, circuit breaker, error contract |
| `docs/PLANS.md` | Plans index linking to exec-plans/ |

## Domain Knowledge

| File | Purpose |
|------|---------|
| `docs/01-data-catalog.md` | Data catalog (products, inventory, orders, accounting) |
| `docs/02-entity-relationship.md` | ERD, entity relationships, code systems |
| `docs/03-business-workflow.md` | End-to-end: purchase -> logistics -> inventory -> sales -> accounting |
| `docs/04-tool-reference.md` | MCP tool reference + internal API endpoints |
| `docs/05-api-coverage-gap.md` | API coverage gap analysis (~80% coverage) |
| `docs/07-internal-api-reverse-engineering.md` | Internal Web API reverse engineering |

## Architecture Decisions

| File | Purpose |
|------|---------|
| `docs/design-docs/index.md` | Design docs index |
| `docs/design-docs/layer-rules.md` | Import directions, forbidden patterns |
| `docs/design-docs/core-beliefs.md` | Agent-first operating principles |

## Execution Plans

| Directory | Purpose |
|-----------|---------|
| `docs/exec-plans/active/` | In-progress execution plans |
| `docs/exec-plans/completed/` | Completed execution plans |
| `docs/exec-plans/tech-debt-tracker.md` | Known technical debt items |

## Product Specs

| Directory | Purpose |
|-----------|---------|
| `docs/product-specs/index.md` | Product specifications index |
| `docs/references/` | External references |
| `docs/generated/db-schema.md` | Generated schema documentation |

## Agent Operating Rules

1. **Never throw from tool handlers** -- always return `handleToolError(error)`
2. **Layer direction**: Entry -> Tools -> Client -> Utils -> Config (no upward imports)
3. **Tools never import other tools** -- shared logic goes to utils/ or client/
4. **All logs to stderr** -- stdout is reserved for MCP JSON-RPC
5. **Zod validates all inputs** -- no raw `process.env` outside config.ts
6. **Test every change** -- `npm test` before committing
7. **Read before writing** -- consult docs/ for domain context before making changes

## Quick Commands

```bash
npm run build    # TypeScript compile
npm test         # Vitest tests
npm run lint     # Type check (tsc --noEmit)
npm run dev      # Watch mode (tsx)
npm start        # Run built server
```
