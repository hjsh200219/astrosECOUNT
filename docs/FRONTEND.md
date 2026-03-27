# Frontend -- astrosECOUNT

> This project has no frontend. It is a backend MCP server that communicates via stdio JSON-RPC.

## Interface

The "interface" for this project is the MCP tool protocol:

- **Transport**: StdioServerTransport (stdin/stdout JSON-RPC)
- **Consumer**: LLM clients (Claude Desktop, Claude Code, MCP Inspector)
- **Tools**: 58 MCP tools across 22 modules
- **Responses**: JSON text content wrapped in MCP `TextContent` format

## Tool Interface Categories

| Category | Tool Count | Interface Pattern |
|----------|-----------|------------------|
| Connection/Auth | 2 | Login, status check |
| Master Data (CRUD) | 10 | List/Save/View/Delete operations |
| Sales | 12 | Slip CRUD, orders, quotations |
| Purchase | 7 | Purchase slips, POs |
| Inventory | 8 | Stock queries, movements, barcodes |
| Production | 6 | Work orders, BOM management |
| Accounting | 10 | Journals, ledgers, AR/AP |
| Utilities | 3 | Standalone data tools |

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
