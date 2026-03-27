# Design System -- astrosECOUNT

> Coding patterns, naming conventions, and design rules for the ECOUNT ERP MCP Server.

## Code Style

### TypeScript Configuration
- **Target**: ES2022 with Node16 module resolution
- **Strict mode**: Enabled (`strict: true` in tsconfig)
- **ESM**: All files use ES module syntax (`import`/`export`, no `require`)
- **File extensions**: `.ts` source, `.js` in import paths (Node16 ESM requirement)

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | kebab-case | `session-manager.ts`, `error-handler.ts` |
| Classes | PascalCase | `EcountClient`, `SessionManager` |
| Functions | camelCase | `registerAllTools`, `handleToolError` |
| Tool registrars | `register{Name}Tools` | `registerSalesTools(server, client)` |
| Constants | UPPER_SNAKE_CASE | `ECOUNT_COM_CODE`, `SESSION_EXPIRED` |
| Types/Interfaces | PascalCase | `EcountConfig`, `EcountResponse<T>` |
| Zod schemas | camelCase + `Schema` suffix | `envSchema`, `loginParamsSchema` |

### Error Pattern

All tool handlers follow this exact pattern:
```typescript
async (params) => {
  try {
    // business logic
    return formatResponse(result);
  } catch (error) {
    return handleToolError(error);  // NEVER throw
  }
}
```

### Error Hierarchy
```
Error
  +-- EcountApiError (API-level: bad request, not found, etc.)
  +-- SessionExpiredError (session invalidated by server)
  +-- NetworkError (connection failure, timeout)
  +-- CircuitBreakerOpen (internal API circuit breaker tripped)
```

## Tool Design Rules

### Tool Categories
- **Category A**: Requires `EcountClient` -- ERP CRUD operations
- **Category B**: Standalone -- no ERP dependency (BL parser, contacts, business rules)
- **Category B+**: Data utilities -- uses persistence but not EcountClient

### Tool Registration Pattern
```typescript
// Each tool module exports a single registrar function
export function registerXxxTools(server: McpServer, client?: EcountClient): void {
  server.tool("ecount_xxx", "Description", { /* zod schema */ }, async (params) => {
    // implementation
  });
}
```

### Tool Factory Pattern
For CRUD tools, use `registerTools()` from `tool-factory.ts`:
```typescript
const tools: ToolDefinition[] = [
  { name: "ecount_list_xxx", description: "...", endpoint: "XXX/ListXXX", schema: z.object({}) },
];
registerTools(server, client, tools);
```

## Module Organization

### Client Layer Rules
- `ecount-client.ts`: HTTP wrapper for Open API (V2 endpoints)
- `internal-api-client.ts`: HTTP wrapper for Internal Web API (V5 endpoints)
- `session-manager.ts`: Open API session lifecycle
- `internal-session.ts`: Internal API session lifecycle (ec_req_sid cookie)
- `session-orchestrator.ts`: Coordinates dual session lifecycle
- `circuit-breaker.ts`: Resilience pattern for Internal API
- `keypack.ts`: `__$KeyPack` parameter encoder (proprietary ECOUNT format)
- `types.ts`: Shared ECOUNT API response types

### Utils Layer Rules
- `error-handler.ts`: Error classification and MCP error response formatting
- `response-formatter.ts`: MCP `TextContent` response builder
- `logger.ts`: Structured logging to stderr (debug/info/warn/error)
- `persistence.ts`: File-based caching utility (non-authoritative; ERP is source of truth)

## Response Formatting

All tool responses use `formatResponse()` which wraps data as MCP `TextContent`:
```typescript
{ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] }
```

Error responses use `formatError()`:
```typescript
{ content: [{ type: "text", text: errorMessage }], isError: true }
```

## Logging Rules

- All logs go to **stderr** (stdout reserved for MCP JSON-RPC protocol)
- Log levels: `debug`, `info`, `warn`, `error`
- API calls include structured metadata: `{ endpoint, duration, status }`
- Configurable via `LOG_LEVEL` env var
