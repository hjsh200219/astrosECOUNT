# Core Beliefs -- Agent-First Operating Principles

> Foundational principles for how agents and humans collaborate in this repository.

## 1. Documentation is the Interface

Agents navigate codebases through documentation. Every architectural decision,
domain concept, and operating rule must be written down. If it is not documented,
it does not exist for agents.

- `AGENTS.md` is the entry point -- agents read this first
- `agent.md` / `CLAUDE.md` contains invariants and commands
- `docs/` contains domain knowledge and architectural decisions

## 2. Layers Protect Invariants

The layer structure (Entry -> Tools -> Client -> Utils -> Config) exists to
prevent complexity from leaking across boundaries. Agents must respect
dependency directions even when shortcuts seem convenient.

- Tools never import other tools
- Client layer does not know about tool definitions
- Only `config.ts` reads environment variables
- Only `error-handler.ts` crosses the utils->client boundary (for CircuitBreakerOpen)

## 3. Errors are First-Class Citizens

Every error path must be explicitly handled. Silent failures are bugs.
Tool handlers catch all errors and return structured MCP responses.

- `handleToolError()` maps error types to user-friendly messages
- Circuit breaker prevents cascading failures
- Session expiry triggers automatic re-authentication

## 4. Tests Mirror Source

Every source file has a corresponding test file. This is not just a convention --
it is a navigational aid for agents. To understand what a module does, read its test.

- `src/tools/sales.ts` -> `tests/tools/sales.test.ts`
- `src/client/circuit-breaker.ts` -> `tests/client/circuit-breaker.test.ts`

## 5. ERP is Source of Truth

The MCP server is a read/write proxy to ECOUNT ERP. Local state (persistence,
in-memory caches) is for convenience only and must never contradict ERP data.

- No local database
- File persistence is cache-only
- All mutations go through ECOUNT API validation

## 6. Fail Fast, Recover Automatically

- Config validation fails at startup with clear error messages
- Session expiry is detected and recovered without user intervention
- Circuit breaker opens after 3 failures and auto-recovers after 30 seconds
- Graceful degradation: missing config starts server without tools (not crash)

## 7. Agent Changes Must Be Testable

Before committing any code change, agents must:
1. Run `npm test` to verify existing tests pass
2. Add tests for new functionality
3. Run `npm run lint` to verify type safety
4. Verify the change follows layer rules

## 8. Small, Composable Modules

Each tool module registers related tools and nothing else. Shared logic
belongs in utils/ or client/. This keeps modules independently testable
and replaceable.

- Tool modules: 100-300 lines each
- No god objects or mega-modules
- Factory pattern for repetitive CRUD tools
