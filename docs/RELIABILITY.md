# Reliability Standards -- astrosECOUNT

> Last updated: 2026-03-27

## 1. Session Reliability

### Open API Session (SessionManager)
- **Auto-login**: First API call triggers login; session cached in memory
- **Promise deduplication**: Concurrent getSessionId() calls share a single login promise
- **Session expiry detection**: Response error codes SESSION_EXPIRED, INVALID_SESSION, -1
- **Auto-retry**: On session expiry, invalidate -> re-login -> retry original request (max 1 retry)

### Internal API Session (InternalApiSession)
- **TTL-based expiry**: 30-minute TTL tracked locally; preemptive re-login before server rejects
- **Same deduplication**: Shared refresh promise prevents concurrent login floods
- **Independent lifecycle**: Internal session failure MUST NOT affect Open API session

### Rule: No concurrent login storms
Both session managers use `refreshPromise` to deduplicate. Any code that manages sessions MUST
follow this pattern:
```typescript
if (this.refreshPromise) return this.refreshPromise;
this.refreshPromise = this.login().finally(() => { this.refreshPromise = null; });
```

## 2. Circuit Breaker (Internal API)

| State | Behavior |
|-------|----------|
| CLOSED | Normal operation. Failures increment counter. |
| OPEN | All calls rejected with CircuitBreakerOpen. After 30s, transitions to HALF_OPEN. |
| HALF_OPEN | One trial call allowed. Success -> CLOSED. Failure -> OPEN. |

- **Failure threshold**: 3 consecutive failures
- **Reset timeout**: 30,000 ms
- **Scope**: Applied to all InternalApiClient calls

## 3. Network Resilience

- **Timeout**: All fetch() calls use `AbortSignal.timeout(30_000)` (30 seconds)
- **Error classification**: NetworkError (connection) vs EcountApiError (API-level) vs CircuitBreakerOpen
- **Structured logging**: All API calls log endpoint, duration, and status to stderr

## 4. Error Handling Contract

All tool handlers MUST follow this pattern:
```typescript
async (params) => {
  try {
    // ... business logic
    return formatResponse(result);
  } catch (error) {
    return handleToolError(error);  // never throws to MCP layer
  }
}
```

`handleToolError` maps error types to user-friendly MCP error responses.
Tools MUST NOT throw unhandled exceptions -- all errors become `isError: true` MCP responses.

## 5. Data Integrity

- **Input validation**: All tool inputs validated by zod schemas before API calls
- **Config validation**: Environment variables validated at startup; server starts without tools if config missing
- **No direct DB access**: All mutations go through ECOUNT API; no local state mutations on ERP data
- **Persistence**: Local file persistence (utils/persistence.ts) is for caching only; source of truth is ECOUNT API

## 6. Deployment Reliability

- **Graceful degradation**: If ECOUNT config is missing, server starts but registers no tools (warns in logs)
- **Stdio transport**: No network port binding; runs as child process of LLM client
- **No background jobs**: Stateless request/response; no cron, no polling, no websocket connections

## 7. Monitoring

- **Logger levels**: debug, info, warn, error (configurable via LOG_LEVEL env var)
- **Output**: All logs to stderr (stdout reserved for MCP JSON-RPC)
- **Structured metadata**: `{ endpoint, duration, status }` attached to API call logs
