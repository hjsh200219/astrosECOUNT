# Layer Dependency Rules -- astrosECOUNT

> Defines allowed import directions, forbidden patterns, and cross-domain access rules.

## Layer Hierarchy

```
Layer 0: Entry        src/index.ts, src/server.ts
Layer 1: Tools        src/tools/*
Layer 2: Client       src/client/*
Layer 3: Utils        src/utils/*
Layer 4: Config       src/config.ts
Layer 5: External     @modelcontextprotocol/sdk, zod, pdf-lib
```

## Allowed Import Directions

Imports MUST flow **downward** (higher layer number = lower layer). A module may import
from its own layer or any layer below it.

```
Entry (0) --> Tools (1), Client (2), Utils (3), Config (4), External (5)
Tools (1) --> Client (2), Utils (3), Config (4), External (5)
Client (2) --> Utils (3), Config (4), External (5)
Utils (3) --> Config (4), External (5)
Config (4) --> External (5)
```

### Specific Rules

| From | To | Allowed? | Notes |
|------|----|----------|-------|
| `src/tools/*` | `src/client/*` | YES | Tools call EcountClient methods |
| `src/tools/*` | `src/utils/*` | YES | formatResponse, handleToolError |
| `src/tools/*` | `src/tools/*` | NO | Tools must not import each other |
| `src/client/*` | `src/tools/*` | NO | Client layer must not know about tools |
| `src/utils/*` | `src/client/*` | EXCEPTION | `error-handler.ts` imports `CircuitBreakerOpen` for error classification |
| `src/client/*` | `src/client/*` | YES | Internal cross-references within client layer |
| `src/server.ts` | `src/tools/index.ts` | YES | Orchestration entry point |

## Forbidden Patterns

### 1. Circular Dependencies
No circular import chains. If A imports B, B must not (directly or transitively) import A.

**Current exception**: `utils/error-handler.ts` <-> `client/circuit-breaker.ts`
- `error-handler` imports `CircuitBreakerOpen` from `circuit-breaker`
- `circuit-breaker` imports `logger` from `utils/logger`
- This is a cross-layer reference but NOT circular (no cycle formed)

### 2. Tool-to-Tool Imports
Tool modules (e.g., `sales.ts`, `inventory.ts`) MUST NOT import from each other.
Shared logic must be extracted to `utils/` or `client/`.

### 3. Direct `process.env` Access
Only `src/config.ts` may read `process.env`. All other modules receive config via
constructor injection or function parameters.

**Current exception**: `utils/logger.ts` reads `LOG_LEVEL` from `process.env`.
This is acceptable for logging infrastructure but should not be extended to other utils.

### 4. Side Effects in Module Scope
No module may execute side effects (network calls, file I/O) at import time.
All initialization happens in explicit `main()` or factory functions.

## Cross-Domain Access Rules

### Tools accessing ECOUNT API
- **Category A tools**: Receive `EcountClient` instance; call `client.post()` or use `registerTools()` factory
- **Category B tools**: No EcountClient dependency; operate on local data or compute
- **Category B+ tools**: May use persistence utilities but NOT EcountClient

### Adding a New Tool
1. Create `src/tools/{name}.ts` with a `register{Name}Tools(server, client?)` export
2. Add import and call in `src/tools/index.ts`
3. Create corresponding `tests/tools/{name}.test.ts`
4. Follow the Category A/B/B+ pattern based on whether it needs EcountClient

### Adding a New Client Feature
1. Add to `src/client/` layer
2. Keep session management concerns in session-manager or internal-session
3. Keep HTTP concerns in ecount-client or internal-api-client
4. Add tests in `tests/client/`
