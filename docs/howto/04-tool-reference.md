# ECOUNT MCP 도구 레퍼런스 (43 모듈)

> 소스 코드 기준 | 수집일: 2026-03-24 | 최종 업데이트: 2026-04-03
> 아래 23개는 Open API 핵심 도구. Category B/B+ 포함 총 43 모듈 (src/tools/ 참조)

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Desktop / Claude Code                │
│                        (AI 클라이언트)                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ MCP Protocol (stdio)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    astrosECOUNT MCP Server                      │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐     │
│  │ server.ts │→│ tool-factory  │→│ 43개 MCP 도구 모듈 등록   │     │
│  │          │  │ (Save/Query)  │  │ connection(3) master(4)│     │
│  │ McpServer│  └──────┬───────┘  │ sales(3) purchase(2)   │     │
│  │ v1.0.0   │         │          │ inventory(4) prod(3)   │     │
│  └──────────┘         │          │ accounting(1) other(2) │     │
│                       │          │ board(1)               │     │
│  ┌────────────────────▼───────────────────────────────────┐     │
│  │              EcountClient                               │    │
│  │  ┌──────────────────┐  ┌────────────────────────┐      │    │
│  │  │ SessionManager   │  │ post() / postRaw()     │      │    │
│  │  │ - auto login     │  │ - V2 API: /OAPI/V2/... │      │    │
│  │  │ - session cache  │  │ - V3 API: /ec5/api/... │      │    │
│  │  │ - auto refresh   │  │ - session retry (1회)  │      │    │
│  │  │ - deduplication  │  │ - 30s timeout          │      │    │
│  │  └──────────────────┘  └────────────────────────┘      │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS (REST API)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ECOUNT ERP Cloud Server                       │
│  V2 API: oapi{ZONE}.ecount.com/OAPI/V2/{Endpoint}              │
│  V3 API: oapi{ZONE}.ecount.com/ec5/api/app.oapi.v3/action/...  │
│  내부 API: login{ZONE}.ecount.com/ec5/api/app.inventory/...     │
└─────────────────────────────────────────────────────────────────┘
```

### Save vs Query 처리 흐름

```
[Save 도구 호출]                              [Query 도구 호출]
     │                                              │
     ▼                                              ▼
{ ListKey: [{BulkDatas: params}] }           params 직접 전달
     │                                              │
     ▼                                              ▼
  EcountClient.post(endpoint, body)
     │
     ▼
  SessionManager.getSessionId()  ←── 세션 없으면 자동 로그인
     │                                (Promise deduplication)
     ▼
  HTTPS POST → ECOUNT API
     │
     ▼
  응답: Status 200 → Data 반환 | 세션 만료 → 재로그인 1회 재시도
```

---

## 도구 분류 요약

| 카테고리 | 도구 수 | Query | Save | 소스 파일 |
|---------|--------|-------|------|----------|
| 연결 | 3 | 3 | - | connection.ts |
| 기초등록 | 4 | 2 | 2 | master-data.ts |
| 판매 | 3 | - | 3 | sales.ts |
| 구매 | 2 | 1 | 1 | purchase.ts |
| 재고 | 4 | 4 | - | inventory.ts |
| 생산 | 3 | - | 3 | production.ts |
| 회계 | 1 | - | 1 | accounting.ts |
| 기타 | 2 | - | 2 | other.ts |
| 게시판 | 1 | - | 1 | board.ts |
| **합계** | **23** | **10** | **13** | |

---

## 연결 도구 (3개)

### ecount_zone
- **설명**: Zone 정보 조회 (회사코드 → Zone/도메인)
- **타입**: Query (readOnly)
- **엔드포인트**: `POST https://sboapi.ecount.com/OAPI/V2/Zone` (Zone 접미사 없음)
- **입력**:

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| COM_CODE | string | Y | 회사코드 (6자리) |

- **응답 예시**: `{ ZONE: "AA", COM_CODE: "635188", STATUS: "E" }`

### ecount_login
- **설명**: 수동 로그인 (강제 세션 갱신)
- **타입**: Action
- **입력**: 없음 (환경 변수 사용)
- **응답 예시**: `{ success: true, sessionIdPrefix: "36333531..." }`

### ecount_status
- **설명**: 현재 세션 상태 확인
- **타입**: Query (readOnly)
- **입력**: 없음
- **응답 예시**: `{ connected: true, sessionIdPrefix: "36333531..." }`

---

## 기초등록 도구 (4개)

### ecount_save_customer
- **설명**: 거래처 등록/수정
- **타입**: Save
- **엔드포인트**: `Customers/SaveCustomer`
- **입력**:

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| BUSINESS_NO | string | Y | 사업자번호 |
| CUST_NAME | string | Y | 거래처명 |
| CUST_CD | string | N | 거래처코드 (수정 시) |
| CORP_NO | string | N | 법인번호 |
| OWNER | string | N | 대표자명 |
| TEL | string | N | 전화번호 |
| EMAIL | string | N | 이메일 |
| ADDR | string | N | 주소 |

### ecount_save_product
- **설명**: 품목 등록/수정
- **타입**: Save
- **엔드포인트**: `Product/SaveProduct`
- **입력**:

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| PROD_CD | string | Y | 품목코드 |
| PROD_DES | string | Y | 품목명 |
| UNIT | string | N | 단위 (KG 등) |
| PROD_TYPE | string | N | 품목유형 |
| CLASS_CD | string | N | 분류코드 |
| IN_PRICE | string | N | 입고단가 |
| OUT_PRICE | string | N | 출고단가 |

### ecount_view_product
- **설명**: 품목 상세 조회 (단건)
- **타입**: Query (readOnly)
- **엔드포인트**: `Product/ViewProduct`
- **입력**: `PROD_CD` (필수), `COMMA_FLAG` (선택)
- **응답**: 품목 전체 필드 (~80개)

### ecount_list_products
- **설명**: 품목 목록 조회
- **타입**: Query (readOnly)
- **엔드포인트**: `Product/ListProduct`
- **입력**: `COMMA_FLAG` (선택)
- **응답**: `{ TotalCnt, Result: [...] }`

---

## 판매 도구 (3개)

### ecount_save_quotation
- **설명**: 견적서 저장
- **타입**: Save
- **엔드포인트**: `Quotation/SaveQuotation`
- **주요 입력**: CUST, PROD_CD, QTY, PRICE, WH_CD, EMP_CD, PJT_CD, ITEM_CD

### ecount_save_sale_order
- **설명**: 수주(판매주문) 저장
- **타입**: Save
- **엔드포인트**: `SaleOrder/SaveSaleOrder`
- **주요 입력**: CUST, PROD_CD, QTY, WH_CD, PRICE, EMP_CD, PJT_CD, ITEM_CD

### ecount_save_sale
- **설명**: 매출전표 저장
- **타입**: Save
- **엔드포인트**: `SaleSlip/SaveSale`
- **주요 입력**: CUST, PROD_CD, QTY, WH_CD, PRICE, IO_TYPE, EXCHANGE_TYPE, EXCHANGE_RATE, PJT_CD, ITEM_CD

---

## 구매 도구 (2개)

### ecount_save_purchase
- **설명**: 매입전표 저장
- **타입**: Save
- **엔드포인트**: `Purchases/SavePurchases`
- **주요 입력**: PROD_CD, QTY, WH_CD, CUST, PRICE, IO_TYPE, EXCHANGE_TYPE, EXCHANGE_RATE, PJT_CD, ITEM_CD

### ecount_list_purchase_orders
- **설명**: 발주 목록 조회
- **타입**: Query (readOnly)
- **엔드포인트**: `Purchases/GetPurchasesOrderList`
- **제한**: 조회 기간 최대 31일
- **입력**:

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| BASE_DATE_FROM | string | Y | 시작일 (YYYYMMDD) |
| BASE_DATE_TO | string | Y | 종료일 (YYYYMMDD) |
| PROD_CD | string | N | 품목코드 필터 |
| CUST_CD | string | N | 거래처코드 필터 |
| EMP_CD | string | N | 담당자코드 필터 |
| WH_CD | string | N | 창고코드 필터 |
| PAGE_CURRENT | number | N | 페이지 (기본: 1) |
| PAGE_SIZE | number | N | 페이지 크기 (기본: 26) |

- **응답**: `{ TotalCnt, Result: [{ ORD_DATE, ORD_NO, CUST_DES, PROD_DES, QTY, BUY_AMT_F, ... }] }`

---

## 재고 도구 (4개)

### ecount_view_inventory_balance
- **설명**: 특정 품목 재고 잔량 조회
- **엔드포인트**: `InventoryBalance/ViewInventoryBalance`
- **입력**: `PROD_CD` (필수), `BASE_DATE` (필수), `WH_CD` (선택)
- **응답**: `{ TotalCnt, Result: [{ PROD_CD, BAL_QTY }] }`

### ecount_list_inventory_balance
- **설명**: 재고 잔량 목록 조회
- **엔드포인트**: `InventoryBalance/ListInventoryBalance`
- **입력**: `BASE_DATE` (필수), `PROD_CD` (선택), `WH_CD` (선택)
- **응답**: `{ TotalCnt, Result: [{ PROD_CD, BAL_QTY }] }`

### ecount_view_inventory_by_location
- **설명**: 특정 품목 로케이션별 재고 조회
- **엔드포인트**: `InventoryBalance/ViewInventoryBalanceByLocation`
- **입력**: `PROD_CD` (필수), `BASE_DATE` (필수)
- **응답**: `{ TotalCnt, Result: [{ WH_CD, WH_DES, PROD_CD, PROD_DES, BAL_QTY }] }`

### ecount_list_inventory_by_location
- **설명**: 로케이션별 재고 잔량 목록 조회
- **엔드포인트**: `InventoryBalance/ListInventoryBalanceByLocation`
- **입력**: `BASE_DATE` (필수), `PROD_CD` (선택)
- **응답**: `{ TotalCnt, Result: [{ WH_CD, WH_DES, PROD_CD, BAL_QTY }] }`

---

## 생산 도구 (3개)

### ecount_save_job_order
- **설명**: 작업지시 저장
- **엔드포인트**: `Production/SaveJobOrder`
- **주요 입력**: PROD_CD, QTY, WH_CD, CUST, EMP_CD, PJT_CD, ITEM_CD

### ecount_save_goods_issued
- **설명**: 자재 출고(불출) 저장
- **엔드포인트**: `Production/SaveGoodsIssued`
- **주요 입력**: PROD_CD, QTY, WH_CD, CUST, EMP_CD, PJT_CD, ITEM_CD

### ecount_save_goods_receipt
- **설명**: 생산 완료 입고 저장
- **엔드포인트**: `Production/SaveGoodsReceipt`
- **주요 입력**: PROD_CD, QTY, WH_CD, CUST, EMP_CD, PJT_CD, ITEM_CD

---

## 회계 도구 (1개)

### ecount_save_invoice_auto
- **설명**: 자동 세금계산서 저장
- **엔드포인트**: `Account/SaveInvoiceAuto`
- **주요 입력**: CUST, PROD_CD, QTY, WH_CD, PRICE, CUST_DES, EMP_CD, PJT_CD, UPLOAD_SER_NO, ITEM_CD

---

## 기타 도구 (2개)

### ecount_save_open_market_order
- **설명**: 오픈마켓 주문 저장
- **엔드포인트**: `OtherSale/SaveOpenMarketOrder`
- **주요 입력**: CUST, PROD_CD, QTY, WH_CD, PRICE, ORDER_NO, MARKET_TYPE, SHIP_NO, RECEIVER_NAME, RECEIVER_TEL, RECEIVER_ADDR

### ecount_save_clock_in_out
- **설명**: 출퇴근 기록 저장
- **엔드포인트**: `ClockInOut/SaveClockInOut`
- **주요 입력**: EMP_CD, WORK_DATE, WORK_TIME, WORK_TYPE, EMP_DES, DEPT_CD

---

## 게시판 도구 (1개)

### ecount_create_board
- **설명**: 게시판 글 등록 (V3 API)
- **엔드포인트**: `/ec5/api/app.oapi.v3/action/CreateOApiBoardAction`
- **API 버전**: V3 (postRaw 사용, V2와 다른 패턴)
- **주요 입력**: bizz_sid, title, body_ctt, progress_status, label, cust, prod, dept, pjt, pic, complt_dtm

---

## 내부 Web API 도구 (일부 구현)

> 내부 Web API 역공학으로 확인된 조회 기능. 4개 구현 완료 (internal-api.ts).
> 기술 상세: [07-internal-api-reverse-engineering.md](07-internal-api-reverse-engineering.md)

### V5 App API 엔드포인트 패턴

```
POST https://login{ZONE}.ecount.com/ec5/api/app.{MODULE}/action/{ACTION}:{bizz_type}:{mode}
인증: ?ec_req_sid={SESSION_ID}&xce=none
인코딩: __$KeyPack 압축 JSON → Base64 응답
```

### 확인된 V5 App API 조회 엔드포인트 (9개)

| 모듈 | Action | bizz_type | 메뉴 | bizz_sid | 확인 건수 | 구현 상태 |
|------|--------|-----------|------|----------|----------|----------|
| `app.inventory` | `SelectInventorySearchListAction` | `sales` | 판매조회 | `B_000000E040205` | 622건 | 구현 (ecount_list_sales_internal) |
| `app.inventory` | `SelectInventorySearchListAction` | `purchases` | 구매조회 | `B_000000E040303` | 261건 | 구현 (ecount_list_purchases_internal) |
| `app.inventory` | `SelectInventorySearchListAction` | `quotation` | 견적서조회 | `B_000000E040201` | 3건 | 미구현 |
| `app.inventory` | `SelectInventorySearchListAction` | `sales_order` | 주문서조회 | `B_000000E040203` | 0건 | 미구현 |
| `app.vatslip` | `SelectVatSlipListAction` | `vatslipkor` | 세금계산서 | `B_000000E010727` | 147건 | 구현 (ecount_list_vat_slips_internal) |
| `app.account` | `SelectAccountSearchListAction` | `account_slip` | 회계전표 | — | 1,609건 | 구현 (ecount_list_account_slips_internal) |
| `app.account` | `SelectAccountSearchBalProcessAction` | `account_bond` | 채권관리 | — | 0건 | 미구현 |
| `app.account` | `SelectAccountSearchBalProcessAction` | `account_debt` | 채무관리 | — | 0건 | 미구현 |
| `app.tax` | `SelectVatfilingListAction` | `vat_filing` | 부가세신고서 | `B_000000E030215` | 1건 | 미구현 |

### V3 Legacy SSR 메뉴 (fetch 캡처 불가)

| 페이지 ID | 메뉴 | 추정 건수 | 비고 |
|-----------|------|----------|------|
| ESA001M | 거래처리스트 | ~320건 | 서버사이드 렌더링 |
| ESA009M | 품목등록 | ~29건 | 서버사이드 렌더링 |
| ESG005M | 발주서조회 | ~30건 | Open API로 대체 가능 |
| ESJ005M | 작업지시서조회 | 0건 | 데이터 없음 |
| ESJ010M | 생산입고조회 | 0건 | 데이터 없음 |
| ESS015R | 일별이익현황 | — | 리포트 형태 |

> 구현 시 KeyPack 인코더/디코더 및 웹 로그인 모듈 필요. V3 Legacy 메뉴는 HTML 파싱 또는 별도 접근 전략 필요.
