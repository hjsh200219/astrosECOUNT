# Architecture -- astrosECOUNT

> ECOUNT ERP Open API MCP Server
> Last updated: 2026-03-27

## System Overview

MCP (Model Context Protocol) server that wraps ECOUNT ERP Open API + Internal Web API,
enabling LLMs to query/create/update ERP data via natural language.

```
LLM (Claude Desktop/Code)
  |  stdio (JSON-RPC)
  v
McpServer (src/server.ts)
  |
  +-- registerAllTools() --> 22 tool modules (src/tools/*)
  |     |
  |     +-- Category A: ERP CRUD (via EcountClient) -- sales, purchase, inventory, ...
  |     +-- Category B: Standalone utilities -- BL parser, contacts, business-rules, ...
  |     +-- Category B+: Data utilities -- inventory-verify, stale-shipments, csv-export, ...
  |
  +-- EcountClient (src/client/ecount-client.ts)
  |     |
  |     +-- SessionManager (Open API, API_CERT_KEY auth)
  |     +-- SessionOrchestrator (dual session: Open + Internal)
  |
  +-- InternalApiClient (src/client/internal-api-client.ts)
        |
        +-- InternalApiSession (ec_req_sid cookie, ~30min TTL)
        +-- CircuitBreaker (resilience: CLOSED/OPEN/HALF_OPEN)
        +-- KeyPackEncoder (proprietary __$KeyPack parameter encoding)
```

## Domain Map

| Domain | Files | Description |
|--------|-------|-------------|
| **Entry point** | `src/index.ts`, `src/server.ts` | Stdio transport bootstrap, McpServer creation |
| **Config** | `src/config.ts` | Zod-validated env vars, Open API + Internal API config |
| **Client** | `src/client/*` (8 files) | HTTP client, session management, circuit breaker, KeyPack |
| **Tools** | `src/tools/*` (22 files) | MCP tool definitions, tool-factory pattern |
| **Utils** | `src/utils/*` (4 files) | Error handling, response formatting, logging, persistence |
| **Tests** | `tests/*` (36 files) | Vitest unit/integration tests, mirrors src/ structure |
| **Docs** | `docs/*` | Domain knowledge, API docs, data catalog, raw JSON samples |

## Layer Structure

```
 Layer 0: Entry        index.ts --> server.ts
 Layer 1: Tools        src/tools/*  (22 modules, registered by tools/index.ts)
 Layer 2: Client       src/client/*  (EcountClient, SessionManager, InternalApiClient)
 Layer 3: Utils        src/utils/*  (error-handler, response-formatter, logger, persistence)
 Layer 4: Config       src/config.ts  (env validation)
 Layer 5: External     @modelcontextprotocol/sdk, zod, pdf-lib
```

## Dependency Directions (allowed)

```
Entry --> Tools --> Client --> Utils --> Config
Entry --> Config
Tools --> Utils
Client --> Config
```

## Key Patterns

1. **Tool Factory** (`tool-factory.ts`): Declarative CRUD tool registration via `ToolDefinition[]`
2. **Dual Session**: Open API (long-lived SESSION_ID) + Internal API (ec_req_sid, 30min TTL)
3. **Promise Deduplication**: Concurrent `getSessionId()` calls share a single login promise
4. **Circuit Breaker**: Internal API calls protected by 3-failure threshold, 30s reset
5. **Session Auto-Retry**: Both clients detect session expiry and retry once after re-login
6. **Zod Schemas**: All tool inputs validated at runtime; config validated at startup

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript (ESM, strict mode) |
| Target | ES2022, Node16 module resolution |
| Runtime | Node.js >= 18 |
| Protocol | MCP SDK v1.27.1 (StdioServerTransport) |
| Validation | Zod v3.25 |
| PDF | pdf-lib v1.17.1 |
| Test | Vitest v3 |
| Dev | tsx (TypeScript execution) |

## Data Flow

```
1. LLM sends tool call via stdio JSON-RPC
2. McpServer routes to registered tool handler
3. Tool handler validates input (zod), calls EcountClient.post()
4. EcountClient acquires SESSION_ID (auto-login if needed)
5. HTTP POST to https://oapi{ZONE}.ecount.com/OAPI/V2/{endpoint}
6. Response parsed, session expiry detected -> auto-retry if needed
7. formatResponse() wraps data as MCP TextContent
8. Result returned to LLM
```
