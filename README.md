# ECOUNT ERP MCP Server

ECOUNT ERP의 Open API를 [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) 서버로 래핑한 프로젝트입니다.
Claude 등 LLM에서 자연어로 ECOUNT ERP 데이터를 조회/생성/수정할 수 있습니다.

## 개요

- **58개 MCP 도구** — ECOUNT ERP의 8개 카테고리를 커버
- **자동 세션 관리** — 로그인, 세션 만료 시 자동 재인증, 동시성 제어
- **타입 안전** — 모든 입력에 zod 스키마 검증
- **Claude Desktop / Claude Code 호환** — StdioServerTransport 기반

### 지원 카테고리

| 카테고리 | 도구 수 | 주요 기능 |
|---------|--------|----------|
| 연결/인증 | 2 | 로그인, 세션 상태 확인 |
| 기초정보 | 10 | 품목, 거래처, 창고, 부서, 사원, 계정, 프로젝트 |
| 매출 | 12 | 매출전표, 수주, 판매단가, 견적서 |
| 매입 | 7 | 매입전표, 발주 |
| 재고 | 8 | 재고현황, 입출고, 재고이동, 재고조정, 바코드 |
| 생산 | 6 | 생산지시, 생산실적, BOM |
| 회계 | 10 | 회계전표, 총계정원장, 현금출납, 매출채권, 매입채무, 계좌 |
| 기타 | 3 | 외주, LOT 추적 |

## 사전 요구사항

- **Node.js** >= 18.0.0
- **ECOUNT ERP 계정** — Open API 인증키 필요 ([ECOUNT 관리자 설정](https://login.ecount.com/)에서 발급)

## 설치

```bash
# 저장소 클론
git clone <repository-url>
cd astrosECOUNT

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
```

`.env` 파일을 열고 ECOUNT ERP 인증 정보를 입력합니다:

```env
ECOUNT_COM_CODE=회사코드
ECOUNT_USER_ID=사용자ID
ECOUNT_API_CERT_KEY=API인증키
ECOUNT_ZONE=AA
ECOUNT_LAN_TYPE=ko-KR
```

| 변수 | 설명 | 예시 |
|-----|------|-----|
| `ECOUNT_COM_CODE` | ECOUNT 회사 코드 | `123456` |
| `ECOUNT_USER_ID` | ECOUNT 사용자 ID | `admin` |
| `ECOUNT_API_CERT_KEY` | API 인증키 (ECOUNT 관리자에서 발급) | `xxxxxxxx-xxxx-...` |
| `ECOUNT_ZONE` | ECOUNT 서버 존 (`loginXX.ecount.com`의 `XX` 부분) | `AA`, `AU1`, `AU2` 등 |
| `ECOUNT_LAN_TYPE` | 언어 설정 | `ko-KR`, `en-US` |

## 빌드 및 실행

```bash
# TypeScript 빌드
npm run build

# 서버 실행 (stdio 모드)
npm start

# 개발 모드 (파일 변경 시 자동 재시작)
npm run dev
```

## Claude Desktop 연동

`claude_desktop_config.json`에 다음을 추가합니다. GitHub에서 직접 설치/실행됩니다:

```json
{
  "mcpServers": {
    "ecount-erp": {
      "command": "npx",
      "args": ["-y", "github:hjsh200219/astrosECOUNT"],
      "env": {
        "ECOUNT_COM_CODE": "회사코드",
        "ECOUNT_USER_ID": "사용자ID",
        "ECOUNT_API_CERT_KEY": "API인증키",
        "ECOUNT_ZONE": "AA",
        "ECOUNT_LAN_TYPE": "ko-KR"
      }
    }
  }
}
```

> **config 파일 위치**
> - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
> - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

## Claude Code 연동

`.claude/settings.json` 또는 프로젝트의 `.mcp.json`에 추가합니다:

```json
{
  "mcpServers": {
    "ecount-erp": {
      "command": "npx",
      "args": ["-y", "github:hjsh200219/astrosECOUNT"],
      "env": {
        "ECOUNT_COM_CODE": "회사코드",
        "ECOUNT_USER_ID": "사용자ID",
        "ECOUNT_API_CERT_KEY": "API인증키",
        "ECOUNT_ZONE": "AA",
        "ECOUNT_LAN_TYPE": "ko-KR"
      }
    }
  }
}
```

## 사용 예시

Claude에서 자연어로 질문하면 MCP 도구가 자동으로 호출됩니다:

```
"이번 달 매출전표 목록을 보여줘"
→ ecount_list_sale_slips 호출

"품목 코드 A001의 재고 현황을 알려줘"
→ ecount_list_inventory_by_product 호출

"거래처 B사에 견적서를 작성해줘"
→ ecount_save_quotation 호출

"ECOUNT 세션 상태를 확인해줘"
→ ecount_status 호출
```

## 개발

```bash
# 테스트 실행
npm test

# 테스트 워치 모드
npm run test:watch

# 타입 체크
npm run lint

# MCP Inspector로 디버깅
npm run inspector
```

## 프로젝트 구조

```
astrosECOUNT/
├── src/
│   ├── index.ts                  # 서버 엔트리포인트
│   ├── server.ts                 # McpServer 인스턴스 생성
│   ├── config.ts                 # 환경 변수 로딩 및 검증
│   ├── client/
│   │   ├── ecount-client.ts      # HTTP 클라이언트 (fetch 래퍼)
│   │   ├── session-manager.ts    # 세션 관리 (로그인/갱신/만료)
│   │   └── types.ts              # ECOUNT API 공통 타입
│   ├── tools/
│   │   ├── index.ts              # 도구 등록 오케스트레이터
│   │   ├── tool-factory.ts       # CRUD 도구 자동 등록 팩토리
│   │   ├── connection.ts         # 인증/연결 도구
│   │   ├── master-data.ts        # 기초정보 (품목, 거래처 등)
│   │   ├── sales.ts              # 매출 (전표, 수주, 견적)
│   │   ├── purchase.ts           # 매입 (전표, 발주)
│   │   ├── inventory.ts          # 재고 (현황, 입출고, 바코드)
│   │   ├── production.ts         # 생산 (지시, 실적, BOM)
│   │   ├── accounting.ts         # 회계 (전표, 원장, 채권/채무)
│   │   └── other.ts              # 기타 (외주, LOT)
│   └── utils/
│       ├── response-formatter.ts # MCP 응답 포맷 헬퍼
│       ├── error-handler.ts      # 에러 처리 유틸
│       └── logger.ts             # stderr 로거
├── tests/                        # vitest 단위 테스트
├── build/                        # 컴파일 출력
├── .env.example                  # 환경 변수 템플릿
└── package.json
```

## 기술 스택

- **TypeScript** (ESM) — 타입 안전한 개발
- **@modelcontextprotocol/sdk** v1.27.1 — MCP 프로토콜 구현
- **zod** v3.25 — 런타임 입력 스키마 검증
- **vitest** — 단위/통합 테스트
- **tsx** — 개발용 TypeScript 실행

## 라이선스

Private
