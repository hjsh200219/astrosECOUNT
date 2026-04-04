# Architecture -- astrosECOUNT

> ECOUNT ERP Open API MCP Server
> TypeScript (ESM, strict) | Node >= 18 | MCP SDK v1.28

## System Overview

MCP server wrapping ECOUNT ERP Open API + Internal Web API, enabling LLMs
to query/create/update ERP data via natural language over stdio JSON-RPC.

```
LLM (Claude Desktop/Code)
  |  stdio (JSON-RPC)
  v
McpServer (src/server.ts)
  |
  +-- registerAllTools() --> 40 tool modules (src/tools/*)
  |     +-- Category A: ERP CRUD (via EcountClient)
  |     +-- Category B: Standalone utilities (no ERP dependency)
  |     +-- Category B+: Data utilities (stores, no EcountClient)
  |
  +-- EcountClient (src/client/ecount-client.ts)
  |     +-- SessionManager (Open API, API_CERT_KEY auth)
  |     +-- SessionOrchestrator (dual session: Open + Internal)
  |
  +-- InternalApiClient (src/client/internal-api-client.ts)
        +-- InternalApiSession (ec_req_sid cookie, ~30min TTL)
        +-- CircuitBreaker (CLOSED/OPEN/HALF_OPEN resilience)
        +-- KeyPackEncoder (__$KeyPack parameter encoding)
```

## Domain Map

| Domain | Files | Description |
|--------|-------|-------------|
| **Entry** | `src/index.ts`, `src/server.ts` | Stdio transport, McpServer creation |
| **Config** | `src/config.ts` | Zod-validated env vars (Open API + Internal API) |
| **Client** | `src/client/*` (8 files) | HTTP client, session mgmt, circuit breaker, KeyPack |
| **Tools** | `src/tools/*` (40 modules + index + factory) | MCP tool definitions, tool-factory pattern |
| **Utils** | `src/utils/*` (23 files) | Error handling, response formatting, renderers, logging, stores |
| **Types** | `src/types/*` (1 file) | Type declarations (popbill) |
| **Tests** | `tests/*` (71 files) | Vitest unit/integration/e2e tests (mirrors src/) |
| **Docs** | `docs/*` | Domain knowledge, API docs, architecture decisions |

## Layer Structure

```
Layer 0: Entry        src/index.ts --> src/server.ts
Layer 1: Tools        src/tools/*  (40 modules)
Layer 2: Client       src/client/*  (EcountClient, SessionManager, InternalApiClient)
Layer 3: Utils        src/utils/*  (error-handler, response-formatter, renderers, logger, stores)
Layer 4: Config       src/config.ts
Layer 5: External     @modelcontextprotocol/sdk, zod, pdf-lib
```

## Dependency Direction (allowed)

```
Entry (0) --> Tools (1) --> Client (2) --> Utils (3) --> Config (4) --> External (5)
                            |                |
                            +-- Config (4)   +-- Config (4)
```

No upward imports. Tools must not import other tools.

## Key Patterns

1. **Tool Factory**: Declarative CRUD registration via `ToolDefinition[]`
2. **Dual Session**: Open API (long-lived SESSION_ID) + Internal API (ec_req_sid, 30min TTL)
3. **Promise Deduplication**: Concurrent `getSessionId()` calls share single login promise
4. **Circuit Breaker**: Internal API: 3 failures -> OPEN (30s reset) -> HALF_OPEN
5. **Session Auto-Retry**: Detect expiry, invalidate, re-login, retry once
6. **Zod Schemas**: Runtime validation on all tool inputs and config

## Data Flow

```
1. LLM sends tool call via stdio JSON-RPC
2. McpServer routes to registered tool handler
3. Tool validates input (zod), calls EcountClient.post()
4. EcountClient acquires SESSION_ID (auto-login if needed)
5. HTTP POST to https://oapi{ZONE}.ecount.com/OAPI/V2/{endpoint}
6. Response parsed; session expiry -> auto-retry if needed
7. formatResponse() wraps data as MCP TextContent
8. Result returned to LLM
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript (ESM, strict mode) |
| Runtime | Node.js >= 18 |
| Protocol | MCP SDK v1.28 (StdioServerTransport) |
| Validation | Zod v4 |
| PDF | pdf-lib v1.17.1 |
| Test | Vitest v4 |
| Dev | tsx (TypeScript execution) |

## Tool Categories (40 modules)

| Category | Modules | Examples |
|----------|---------|---------|
| Connection | connection.ts | Login, status check |
| Master Data | master-data.ts | Products, customers, warehouses |
| Sales | sales.ts | Sale slips, orders, quotations |
| Purchase | purchase.ts | Purchase slips, POs |
| Inventory | inventory.ts | Stock status, in/out, transfers |
| Production | production.ts | Work orders, BOM |
| Accounting | accounting.ts | Journals, ledgers, AR/AP |
| Utilities | bl-parser, contacts, contracts, etc. | B/L parsing, PDF stamps, diagrams |
| Internal API | internal-api.ts | V5 web API access |
| Data Utils | inventory-verify, csv-export, daily-report | Verification, export, reporting |
