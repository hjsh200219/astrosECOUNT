# Security -- astrosECOUNT

> Authentication, secrets management, and security rules for the ECOUNT ERP MCP Server.

## Authentication Architecture

### Dual Session Model

```
Open API Session                     Internal Web API Session
  |                                    |
  +-- API_CERT_KEY (env var)           +-- WEB_ID + WEB_PW (env vars)
  +-- OAPILogin endpoint              +-- Web login endpoint
  +-- SESSION_ID (URL param)           +-- ec_req_sid (cookie)
  +-- Long-lived (server-managed)      +-- 30-minute TTL (client-tracked)
  +-- Auto-retry on expiry             +-- Auto-retry on expiry
```

### Session Isolation Rule
Open API and Internal API sessions are **independent**. A failure in one must NOT
affect the other. This is enforced by `SessionOrchestrator`.

## Secrets Management

### Required Environment Variables
| Variable | Purpose | Sensitivity |
|----------|---------|:-----------:|
| `ECOUNT_COM_CODE` | Company identifier | Medium |
| `ECOUNT_USER_ID` | API user ID | Medium |
| `ECOUNT_API_CERT_KEY` | Open API authentication key | **HIGH** |
| `ECOUNT_ZONE` | Server zone routing | Low |
| `ECOUNT_LAN_TYPE` | Language setting | Low |

### Optional (Internal API)
| Variable | Purpose | Sensitivity |
|----------|---------|:-----------:|
| `ECOUNT_WEB_ID` | Web login username | **HIGH** |
| `ECOUNT_WEB_PW` | Web login password | **CRITICAL** |

### Rules
1. **No secrets in code**: All credentials via environment variables
2. **No secrets in git**: `.env` is in `.gitignore`
3. **Config isolation**: Only `src/config.ts` reads `process.env` (exception: logger reads `LOG_LEVEL`)
4. **Zod validation at startup**: Missing or malformed credentials fail fast with clear error messages
5. **No credential logging**: Logger must never log session IDs, passwords, or API keys

## Transport Security

- **HTTPS only**: All ECOUNT API calls use `https://` endpoints
- **Timeout**: 30-second `AbortSignal.timeout` on all fetch calls
- **No port binding**: Stdio transport; no HTTP server exposed
- **No CORS concerns**: Not a web server

## Input Validation

- **All tool inputs**: Validated by Zod schemas before any API call
- **Config validation**: Environment variables validated at startup
- **No SQL injection risk**: All data access through ECOUNT REST API
- **No user file uploads**: Tools process structured data only (exception: PDF stamp tool)

## Error Disclosure

- **API error codes**: Forwarded to LLM (non-sensitive, needed for debugging)
- **Stack traces**: Logged to stderr only; never returned in MCP responses
- **Session IDs**: Passed as URL parameters (ECOUNT API design); not logged

## Circuit Breaker Security

The circuit breaker on Internal API prevents:
- **Credential lockout**: Stops repeated failed login attempts
- **Server abuse**: 3 failures -> 30-second cooldown
- **Cascading failures**: Internal API issues don't propagate to Open API

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| Credential exposure in logs | Logger excludes sensitive fields |
| Credential exposure in git | `.env` in `.gitignore` |
| Session hijacking | Sessions are process-scoped, not exposed over network |
| API abuse | Circuit breaker limits retry storms |
| Malicious tool input | Zod validation rejects invalid data |
| Man-in-the-middle | HTTPS-only API communication |

## Audit Points

- [ ] Verify no secrets in git history
- [ ] Verify logger does not output SESSION_ID values
- [ ] Verify `.env.example` contains only placeholder values
- [ ] Verify circuit breaker thresholds are appropriate
- [ ] Verify Zod schemas reject unexpected fields
