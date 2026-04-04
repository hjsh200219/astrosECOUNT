# ECOUNT ERP MCP Server

ECOUNT ERP의 Open API를 [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) 서버로 래핑한 프로젝트입니다.
Claude 등 LLM에서 자연어로 ECOUNT ERP 데이터를 조회/생성/수정할 수 있습니다.

## 개요

- **40개 도구 모듈** — ECOUNT ERP 핵심 CRUD + 물류/재무/운영 분석 + 외부 연동
- **자동 세션 관리** — 로그인, 세션 만료 시 자동 재인증, Promise 중복 제거
- **듀얼 세션 격리** — Open API / Internal Web API 장애 독립 운영
- **서킷 브레이커** — Internal API 3회 실패 시 자동 차단 (30초 리셋)
- **타입 안전** — 모든 입력에 Zod 스키마 검증
- **Claude Desktop / Claude Code / Cursor 호환** — StdioServerTransport 기반

### 지원 카테고리

| 카테고리 | 도구 모듈 | 주요 기능 |
|---------|----------|----------|
| 연결/인증 | `connection` | 로그인, 세션 상태 확인 |
| 기초정보 | `master-data` | 품목, 거래처, 창고, 부서, 사원, 계정, 프로젝트 |
| 매출 | `sales` | 매출전표, 수주, 판매단가, 견적서 |
| 매입 | `purchase` | 매입전표, 발주 |
| 재고 | `inventory` | 재고현황, 입출고, 재고이동, 재고조정, 바코드 |
| 생산 | `production` | 생산지시, 생산실적, BOM |
| 회계 | `accounting` | 회계전표, 총계정원장, 현금출납 |
| 게시판 | `board` | 게시판 CRUD |
| 기타 | `other` | 외주, LOT 추적 |
| 내부 API | `internal-api` | ECOUNT 내부 웹 API (KeyPack 프로토콜) |
| B/L 파서 | `bl-parser` | 선하증권 PDF 파싱 |
| 연락처 | `contacts` | 거래처 연락처 관리 |
| 비즈니스 규칙 | `business-rules` | ERP 비즈니스 규칙 조회 |
| 계약 | `contracts` | 계약 관리 |
| 이메일 | `email-templates` | 이메일 템플릿 생성 |
| 배송 추적 | `shipment-tracking` | 배송 상태 추적 |
| 물류 KPI | `logistics-kpi` | 물류 성과 지표 |
| 관세/비용 | `customs-cost` | 수입 관세 및 부대비용 계산 |
| 지연 배송 | `stale-shipments` | 미착/장기 미처리 배송 감지 |
| 재고 검증 | `inventory-verify` | 재고 데이터 정합성 검증 |
| 재고 수명 | `inventory-lifecycle` | 재고 에이징/수명주기 분석 |
| 재고 조정 | `adjust-inventory` | 재고 조정 처리 |
| 매출채권 | `receivables` | 매출채권 분석 |
| 매입채무 | `payables` | 매입채무 분석 |
| 중량 정산 | `weight-settlement` | 중량 기반 정산 |
| 재무제표 | `financial-statements` | 재무제표 생성 |
| 마진 분석 | `margin-analysis` | 제품별/거래처별 마진 분석 |
| 대시보드 | `dashboard` | 경영 대시보드 데이터 집계 |
| PDF 내보내기 | `pdf-export` | 전표/보고서 PDF 생성 |
| PDF 도장 | `pdf-stamp` | PDF 문서에 도장/날인 삽입 |
| CSV 내보내기 | `csv-export` | 데이터 CSV 변환/내보내기 |
| 팩스 | `fax` | Popbill 팩스 전송 |
| 일일 보고 | `daily-report` | 일일 업무 보고서 생성 |
| 헬스 체크 | `health-check` | API 연결 상태 점검 |
| 데이터 무결성 | `data-integrity` | 전표 간 데이터 정합성 검증 |
| 문서 상태 | `document-status` | 전표 진행 상태 추적 |
| 다이어그램 | `diagram` | Mermaid 기반 다이어그램 렌더링 |
| 지도 | `map` | 물류 경로 지도 시각화 |
| 프레젠테이션 | `presentation` | 슬라이드 프레젠테이션 생성 |
| 3D 시각화 | `three-d` | 3D 데이터 시각화 렌더링 |

## 사전 요구사항

- **Node.js** >= 18.0.0
- **ECOUNT ERP 계정** — Open API 인증키 필요 ([ECOUNT 관리자 설정](https://login.ecount.com/)에서 발급)

## 설치

### 방법 1: npx로 바로 실행 (권장)

별도 클론 없이 Claude Desktop / Claude Code / Cursor 설정에서 바로 사용할 수 있습니다.
아래 [클라이언트 연동](#클라이언트-연동) 섹션을 참고하세요.

### 방법 2: 소스에서 빌드

```bash
git clone https://github.com/hjsh200219/astrosECOUNT.git
cd astrosECOUNT

npm install
```

## 환경 변수

### 필수 (ECOUNT Open API)

| 변수 | 설명 | 예시 |
|-----|------|-----|
| `ECOUNT_COM_CODE` | ECOUNT 회사 코드 | `123456` |
| `ECOUNT_USER_ID` | ECOUNT 사용자 ID | `admin` |
| `ECOUNT_API_CERT_KEY` | API 인증키 (ECOUNT 관리자에서 발급) | `xxxxxxxx-xxxx-...` |
| `ECOUNT_ZONE` | 서버 존 (`loginXX.ecount.com`의 `XX`) | `AA`, `AU1`, `AU2` 등 |
| `ECOUNT_LAN_TYPE` | 언어 설정 (기본값: `ko-KR`) | `ko-KR`, `en-US` |
| `ECOUNT_API_MODE` | API 모드 (기본값: `production`) | `production`, `sandbox` |

### 선택: Internal Web API

ECOUNT 내부 웹 API 기능을 사용하려면 웹 로그인 자격증명이 필요합니다.

| 변수 | 설명 |
|-----|------|
| `ECOUNT_WEB_ID` | ECOUNT 웹 로그인 ID |
| `ECOUNT_WEB_PW` | ECOUNT 웹 로그인 비밀번호 |

### 선택: Popbill 팩스

팩스 전송 기능을 사용하려면 [Popbill](https://www.popbill.com/) 연동 설정이 필요합니다.

| 변수 | 설명 |
|-----|------|
| `POPBILL_LINK_ID` | Popbill 링크 아이디 |
| `POPBILL_SECRET_KEY` | Popbill 비밀키 |
| `POPBILL_IS_TEST` | 테스트 모드 (기본값: `true`) |

### 외부 MCP: korea-public-data-mcp

아래 기능은 이 프로젝트에 포함되지 않으며, 별도의 **korea-public-data-mcp** 서버에서 제공합니다.

| 기능 | 설명 |
|------|------|
| 관세환율 / 시장환율 | 한국수출입은행, 관세청 고시환율 조회 |
| 관세청 유니패스 | 통관진행정보, 화물추적, HS부호, 관세율 등 51개 API |
| 축산물 이력추적 | 농림축산식품부 MAFRA 축산물 이력 조회 |

환율 조회, 유니패스 통관 조회, 축산물 이력 추적이 필요하면 `korea-public-data-mcp`를 호출하세요.
설치 방법은 [public-data MCP 설치 가이드](docs/howto/10-public-data-setup-guide.md)를 참고하세요.

## 빌드 및 실행

```bash
# TypeScript 빌드
npm run build

# 서버 실행 (stdio 모드)
npm start

# 개발 모드 (파일 변경 시 자동 재시작)
npm run dev
```

## 클라이언트 연동

### Claude Desktop

`claude_desktop_config.json`에 다음을 추가합니다:

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

### Claude Code

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

### Cursor

Cursor Settings > MCP 에서 서버를 추가하거나, 프로젝트 루트의 `.cursor/mcp.json`에 설정합니다:

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

"이번 달 마진 분석 보고서를 만들어줘"
→ ecount_margin_analysis 호출

"경영 대시보드 데이터를 보여줘"
→ ecount_dashboard 호출

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
│   ├── index.ts                     # 서버 엔트리포인트 (stdio transport)
│   ├── server.ts                    # McpServer 인스턴스 팩토리
│   ├── config.ts                    # 환경 변수 검증 (Zod)
│   ├── client/
│   │   ├── ecount-client.ts         # Open API HTTP 클라이언트
│   │   ├── session-manager.ts       # Open API 세션 관리
│   │   ├── session-orchestrator.ts  # 듀얼 세션 오케스트레이션
│   │   ├── internal-api-client.ts   # Internal Web API 클라이언트
│   │   ├── internal-session.ts      # Internal API 세션 관리
│   │   ├── keypack.ts               # __$KeyPack 인코더/디코더
│   │   ├── circuit-breaker.ts       # Internal API 서킷 브레이커
│   │   └── types.ts                 # ECOUNT API 공통 타입
│   ├── tools/
│   │   ├── index.ts                 # 도구 등록 오케스트레이터
│   │   ├── tool-factory.ts          # CRUD 도구 자동 등록 팩토리
│   │   ├── connection.ts            # 인증/연결
│   │   ├── master-data.ts           # 기초정보
│   │   ├── sales.ts                 # 매출
│   │   ├── purchase.ts              # 매입
│   │   ├── inventory.ts             # 재고
│   │   ├── production.ts            # 생산
│   │   ├── accounting.ts            # 회계
│   │   ├── board.ts                 # 게시판
│   │   ├── other.ts                 # 외주, LOT
│   │   ├── internal-api.ts          # 내부 웹 API
│   │   ├── ...                      # + 29개 분석/유틸/외부연동 도구
│   ├── types/
│   │   └── popbill.d.ts             # Popbill 타입 선언
│   └── utils/
│       ├── response-formatter.ts    # MCP 응답 포맷 헬퍼
│       ├── error-handler.ts         # 에러 처리 유틸
│       ├── persistence.ts           # 데이터 영속성 유틸
│       └── logger.ts                # stderr 로거
├── tests/                           # Vitest 단위/통합/E2E 테스트
├── docs/                            # 도메인 지식, API 문서, 아키텍처
├── build/                           # 컴파일 출력
└── package.json
```

## 기술 스택

- **TypeScript** v6 (ESM, strict) — 타입 안전한 개발
- **@modelcontextprotocol/sdk** v1.28 — MCP 프로토콜 구현
- **Zod** v4 — 런타임 입력 스키마 검증
- **pdf-lib** — PDF 생성/편집
- **Vitest** v4 — 단위/통합/E2E 테스트
- **tsx** — 개발용 TypeScript 실행

## 라이선스

Private
