# Frontend -- astrosECOUNT

## 공통 금지 사항

- **이모지를 UI 아이콘으로 사용 금지.** OS/브라우저마다 렌더링이 다르고, 텍스트와 간격이 맞지 않음. SVG 아이콘 또는 Remixicon 사용.
- **미구현 페이지로 링크 금지.** 페이지가 없으면 disabled 처리 + "준비 중" 태그 표시.
- **E2E 테스트는 로그인/비로그인 두 상태 모두 검증.**
- **디자인 리뷰 시 모든 상태의 스크린샷 확인 필수.**


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
