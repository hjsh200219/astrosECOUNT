# Frontend -- astrosECOUNT

> This project has no frontend. It is a backend MCP server that communicates via stdio JSON-RPC.

## Interface

The "interface" for this project is the MCP tool protocol:

- **Transport**: StdioServerTransport (stdin/stdout JSON-RPC)
- **Consumer**: LLM clients (Claude Desktop, Claude Code, MCP Inspector)
- **Tools**: MCP tools across 40 modules
- **Responses**: JSON text content wrapped in MCP `TextContent` format

## Tool Interface Categories (40 modules)

| Category | Modules | Interface Pattern |
|----------|---------|------------------|
| Category A (ERP CRUD) | 9 | connection, master-data, sales, purchase, inventory, production, accounting, other, board |
| Category B (Standalone) | 8 | bl-parser, contacts, business-rules, pdf-stamp, email-templates, shipment-tracking, logistics-kpi, contracts |
| Category B (Internal API) | 1 | internal-api (V5 web API access) |
| Category B+ (Utilities) | 22 | inventory-verify, stale-shipments, csv-export, daily-report, health-check, data-integrity, document-status, adjust-inventory, customs-cost, receivables, payables, weight-settlement, inventory-lifecycle, financial-statements, margin-analysis, dashboard, pdf-export, fax, diagram, map, presentation, three-d |

## Testing the Interface

```bash
# Use MCP Inspector for interactive tool testing
npm run inspector

# Run automated tests
npm test
```

## No UI Components

This project contains:
- No HTML/CSS/JSX files
- No React/Vue/Svelte components
- No web server or HTTP endpoints
- No browser-facing code

All interaction happens through the MCP protocol layer.
