# ECOUNT Open API 커버리지 갭 분석

> 최종 검증일: 2026-03-24 | ECOUNT_Open_API_Documentation.md 기준

## 검증 결과 요약

### 샌드박스 (테스트 인증키: ECOUNT_API_CERT_KEY_TEST)

| 지표 | 값 |
|------|-----|
| 테스트 총 건수 | 28건 |
| ✅ 성공 | 21건 |
| ❌ 실패 | 7건 (404 미존재 6건 + 쇼핑몰 미설정 1건) |
| 호스트 | `sboapiAA.ecount.com` |
| 계정 | CHSHIN (테스트 인증키) |

### 실서버 (운영 인증키: ECOUNT_API_CERT_KEY_PROD)

| 지표 | 값 |
|------|-----|
| 테스트 총 건수 | 28건 |
| ✅ 성공 | 14건 |
| ❌ 인증되지 않은 API | 8건 |
| ❌ 404 미존재 엔드포인트 | 6건 |
| 호스트 | `oapiAA.ecount.com` |
| 계정 | CHSHIN (운영 인증키) |

---

## API별 검증 상태 상세

### 3장. 연결 (Login/Zone)

| API | MCP 도구 | 샌드박스 | 실서버 |
|-----|----------|---------|--------|
| Zone | ecount_connection_zone | ✅ | ✅ |
| OAPILogin | ecount_connection_login | ✅ | ✅ |
| (세션 상태) | ecount_connection_status | ✅ | ✅ |

### 4장. 기초등록 (거래처/품목)

| API | MCP 도구 | 래퍼키 | 샌드박스 | 실서버 |
|-----|----------|--------|---------|--------|
| SaveBasicCust | ecount_master_save_customer | `CustList` | ✅ | ✅ |
| ViewBasicCust | - | - | ❌ 404 | ❌ 404 |
| GetBasicCustList | - | - | ❌ 404 | ❌ 404 |
| SaveBasicProduct | ecount_master_save_product | `ProductList` | ✅ | ✅ |
| ViewBasicProduct | ecount_master_view_product | - | ✅ | ✅ |
| GetBasicProductsList | ecount_master_list_products | - | ✅ | ✅ |

> 거래처 조회/목록 API는 V2에 존재하지 않음 (HTTP 404)

### 5장. 판매 (견적/수주/매출)

| API | MCP 도구 | 래퍼키 | 샌드박스 | 실서버 |
|-----|----------|--------|---------|--------|
| SaveQuotation | ecount_sales_save_quotation | `QuotationList` | ✅ | ✅ |
| GetQuotationList | - | - | ❌ 404 | ❌ 404 |
| SaveSaleOrder | ecount_sales_save_sale_order | `SaleOrderList` | ✅ | ❌ **인증되지 않음** |
| GetSaleOrderList | - | - | ❌ 404 | ❌ 404 |
| SaveSale | ecount_sales_save_sale | `SaleList` | ✅ | ❌ **인증되지 않음** |
| GetSaleList | - | - | ❌ 404 | ❌ 404 |

### 6장. 구매 (발주/매입)

| API | MCP 도구 | 래퍼키 | 샌드박스 | 실서버 |
|-----|----------|--------|---------|--------|
| GetPurchasesOrderList | ecount_purchase_list_purchase_orders | - | ✅ | ✅ |
| SavePurchases | ecount_purchase_save_purchase | `PurchasesList` | ✅ | ❌ **인증되지 않음** |
| GetPurchasesList | - | - | ❌ 404 | ❌ 404 |

### 7장. 생산

| API | MCP 도구 | 래퍼키 | 샌드박스 | 실서버 |
|-----|----------|--------|---------|--------|
| SaveJobOrder | ecount_production_save_job_order | `JobOrderList` | ✅ | ❌ **인증되지 않음** |
| SaveGoodsIssued | ecount_production_save_goods_issued | `GoodsIssuedList` | ✅ | ❌ **인증되지 않음** |
| SaveGoodsReceipt | ecount_production_save_goods_receipt | `GoodsReceiptList` | ✅ | ❌ **인증되지 않음** |

### 8장. 재고

| API | MCP 도구 | 샌드박스 | 실서버 |
|-----|----------|---------|--------|
| ViewInventoryBalanceStatus | ecount_inventory_view_inventory_balance | ✅ | ✅ |
| GetListInventoryBalanceStatus | ecount_inventory_list_inventory_balance | ✅ | ✅ |
| ViewInventoryBalanceStatusByLocation | ecount_inventory_view_inventory_by_location | ✅ | ✅ |
| GetListInventoryBalanceStatusByLocation | ecount_inventory_list_inventory_by_location | ✅ | ✅ |

### 9장. 회계

| API | MCP 도구 | 래퍼키 | 샌드박스 | 실서버 |
|-----|----------|--------|---------|--------|
| SaveInvoiceAuto | ecount_accounting_save_invoice_auto | `InvoiceAutoList` | ✅ | ❌ **인증되지 않음** |

### 10장. 기타

| API | MCP 도구 | 샌드박스 | 실서버 |
|-----|----------|---------|--------|
| SaveOpenMarketOrderNew | ecount_other_save_open_market_order | ❌ 마켓 미등록 | ❌ **인증되지 않음** |
| SaveClockInOut | ecount_other_save_clock_in_out | ✅ | ✅ |

### 11장. 게시판

| API | MCP 도구 | 샌드박스 | 실서버 |
|-----|----------|---------|--------|
| CreateOApiBoardAction (V3) | ecount_board_create_board | ✅ | ✅ |

---

## 실서버 인증 상태 분류

### ✅ 실서버 인증 완료 (14건) — 즉시 사용 가능

| 카테고리 | API |
|----------|-----|
| 연결 | Zone, Login |
| 기초정보 | 거래처 등록, 품목 등록/조회/목록 |
| 판매 | 견적 저장 |
| 구매 | 발주 목록 |
| 재고 | 재고현황 4종 |
| 근태 | 출퇴근 저장 |
| 게시판 | 게시물 등록 (V3) |

### ❌ 실서버 미인증 (8건) — ECOUNT 관리자에서 인증 필요

| 카테고리 | API | 오류 메시지 |
|----------|-----|------------|
| 판매 | 수주 저장 (SaveSaleOrder) | 인증되지 않은 API입니다 |
| 판매 | 판매 저장 (SaveSale) | 인증되지 않은 API입니다 |
| 구매 | 매입 저장 (SavePurchases) | 인증되지 않은 API입니다 |
| 생산 | 작업지시서 (SaveJobOrder) | 인증되지 않은 API입니다 |
| 생산 | 생산불출 (SaveGoodsIssued) | 인증되지 않은 API입니다 |
| 생산 | 생산실적 (SaveGoodsReceipt) | 인증되지 않은 API입니다 |
| 회계 | 회계전표 (SaveInvoiceAuto) | 인증되지 않은 API입니다 |
| 쇼핑몰 | 쇼핑몰 주문 (SaveOpenMarketOrderNew) | 인증되지 않은 API입니다 |

> **조치 방법**: ECOUNT ERP → 시스템관리 → API인증현황에서 해당 API에 대해 "실서버 인증키 발급"을 진행해야 합니다. 현재 인증키(`ECOUNT_API_CERT_KEY_PROD`)에 위 8개 API 권한이 포함되어 있지 않습니다.

### ❌ V2 API에 미존재 (6건) — ECOUNT 미제공

| 카테고리 | 시도한 엔드포인트 | 오류 |
|----------|------------------|------|
| 기초정보 | ViewBasicCust, GetBasicCustList | HTTP 404 |
| 판매 | GetQuotationList, GetSaleOrderList, GetSaleList | HTTP 404 |
| 구매 | GetPurchasesList | HTTP 404 |

> 이 6개 API는 ECOUNT V2 Open API에 존재하지 않는 엔드포인트입니다. ECOUNT 측에서 제공하지 않는 기능입니다.

---

## JSON 래퍼키 매핑 (Save API)

검증 과정에서 확인된 각 Save API의 정확한 JSON 형식:

| API | 래퍼키 | UPLOAD_SER_NO 필수 | 주요 필수 필드 |
|-----|--------|-------------------|---------------|
| 거래처 등록 | `CustList` | ❌ | BUSINESS_NO, CUST_NAME |
| 품목 등록 | `ProductList` | ❌ | PROD_CD, PROD_DES |
| 견적 저장 | `QuotationList` | ✅ | IO_DATE, PROD_CD, QTY |
| 수주 저장 | `SaleOrderList` | ✅ | IO_DATE, PROD_CD, QTY |
| 판매 저장 | `SaleList` | ✅ | IO_DATE, WH_CD, PROD_CD, QTY |
| 매입 저장 | `PurchasesList` | ✅ | IO_DATE, PROD_CD, QTY |
| 작업지시서 | `JobOrderList` | ✅ | IO_DATE, PROD_CD, QTY |
| 생산불출 | `GoodsIssuedList` | ✅ | IO_DATE, WH_CD_F, WH_CD_T, PROD_CD, QTY |
| 생산실적 | `GoodsReceiptList` | ✅ | IO_DATE, WH_CD_F, WH_CD_T, PROD_CD, QTY |
| 회계전표 | `InvoiceAutoList` | ❌ | TRX_DATE, TAX_GUBUN, SUPPLY_AMT, VAT_AMT |
| 근태 | `ClockInOutList` | ❌ | ATTDC_DTM_I, ATTDC_DTM_O, EMP_CD |
| 게시판 (V3) | `data` | ❌ | bizz_sid, title, body_ctt |

> 쇼핑몰 API는 다른 형식 사용: `OPENMARKET_CD` + `ORDERS` 배열

---

## 핵심 갭 분석

### 구조적 비대칭: Save 중심 API

ECOUNT Open API는 **저장(입력) 중심으로 설계**되어 있으며, 조회 엔드포인트가 극히 제한적입니다.

```
조회 가능 영역:  품목 | 재고(4종) | 발주서
조회 불가 영역:  거래처목록 | 매출 | 견적 | 수주 | 매입목록 | 생산 | 회계 | 근태 | 게시판
```

이것은 **MCP 서버 구현의 한계가 아니라 ECOUNT Open API 자체의 한계**입니다.

### 영역별 사용 가능성 (Open API + 내부 API 종합)

| 영역 | Open API 저장 | Open API 조회 | 내부 API 조회 | 종합 상태 |
|------|-------------|-------------|-------------|----------|
| 품목 마스터 | ✅ 인증됨 | ✅ 목록+상세 | - | **완전 사용 가능** |
| 재고 현황 | - | ✅ 4종 | - | **완전 사용 가능** |
| 구매/발주 | ❌ 미인증 | ✅ 발주 목록 | **✅ 매입 261건** | **조회 완전** |
| 거래처 | ✅ 인증됨 | ❌ API 없음 | ⚠️ V3 Legacy ~320건 | 저장 가능, 조회는 SSR |
| 견적 | ✅ 인증됨 | ❌ API 없음 | **✅ 3건** | **조회+저장** |
| 판매 (수주/매출) | ❌ 미인증 | ❌ API 없음 | **✅ 622건** | **조회 가능** |
| 생산 | ❌ 미인증 | ❌ API 없음 | ⚠️ V3 Legacy (0건) | 사용 불가 (데이터 없음) |
| 회계 | ❌ 미인증 | ❌ API 없음 | **✅ 1,609건** | **조회 가능** |
| 세금계산서 | - | ❌ API 없음 | **✅ 147건** | **조회 가능** |
| 채권/채무 | - | ❌ API 없음 | **✅ 확인 (0건)** | 조회 가능 (데이터 없음) |
| 부가세 | - | ❌ API 없음 | **✅ 1건** | **조회 가능** |
| 근태 | ✅ 인증됨 | ❌ API 없음 | - | 저장만 가능 |
| 게시판 | ✅ 인증됨 | ❌ API 없음 | - | 저장만 가능 |

### 내부 Web API로 해소된 갭

> 내부 API 역공학 (Playwright 기반)으로 Open API의 조회 한계를 부분 극복

| 영역 | Open API 상태 | 내부 API 상태 | 확인 건수 | 아키텍처 | 비고 |
|------|-------------|-------------|----------|----------|------|
| 판매 조회 | ❌ 없음 | **✅ 확인** | 622건 | V5 app | `app.inventory` / `sales:list` |
| 구매(매입) 조회 | ❌ 없음 | **✅ 확인** | 261건 | V5 app | `app.inventory` / `purchases:list` |
| 견적서 조회 | ❌ 없음 | **✅ 확인** | 3건 | V5 app | `app.inventory` / `quotation:list` |
| 주문서 조회 | ❌ 없음 | **✅ 확인** | 0건 | V5 app | `app.inventory` / `sales_order:list` |
| 세금계산서 | ❌ 없음 | **✅ 확인** | 147건 | V5 app | `app.vatslip` / `vatslipkor:list` |
| 회계전표 | ❌ 없음 | **✅ 확인** | 1,609건 | V5 app | `app.account` / `account_slip:list` |
| 채권관리 | ❌ 없음 | **✅ 확인** | 0건 | V5 app | `app.account` / `account_bond:bal_process` |
| 채무관리 | ❌ 없음 | **✅ 확인** | 0건 | V5 app | `app.account` / `account_debt:bal_process` |
| 부가세신고서 | ❌ 없음 | **✅ 확인** | 1건 | V5 app | `app.tax` / `vat_filing:list` |
| 거래처 목록 | ❌ 없음 | ⚠️ V3 Legacy | ~320건 | V3 SSR | ESA001M — fetch 캡처 불가 |
| 생산 (작업지시/입고) | ❌ 없음 | ⚠️ V3 Legacy | 0건 | V3 SSR | ESJ005M/ESJ010M — fetch 캡처 불가 |
| 발주서 | ✅ Open API | ⚠️ V3 Legacy | ~30건 | V3 SSR | ESG005M — Open API로 대체 가능 |

**커버리지 변화**: Open API 단독 ≈ 17% → Open API + 내부 API ≈ **80%** (V5 app 9개 엔드포인트 + V3 Legacy 6개 메뉴)

### 비즈니스 영향 (수입육 유통)

| 업무 | 영향도 | 설명 |
|------|--------|------|
| 발주/구매 관리 | 🟢 낮음 | 발주서 Open API + 매입 261건 내부 API로 **조회 완전** |
| 재고 관리 | 🟢 낮음 | 4종 조회 도구로 완전 커버 |
| 매출 관리 | 🟡 중간 | 내부 API로 622건 **조회 가능**, 저장은 여전히 미인증 |
| 회계 관리 | 🟡 중간 | 내부 API로 회계전표 1,609건 + 세금계산서 147건 **조회 가능**, 저장 미인증 |
| 세무 관리 | 🟢 낮음 | 부가세신고서 1건 **조회 가능**, 세금계산서 147건 확인 |
| 채권/채무 관리 | 🟡 중간 | 엔드포인트 확인됨 (현재 데이터 0건), 구현 시 즉시 사용 가능 |
| 생산 관리 | 🔴 높음 | V3 Legacy SSR — API 캡처 불가, 데이터 0건 (미사용 추정) |

---

## 조치 사항

### 즉시 (P0): ECOUNT 관리자에서 API 인증 추가

ECOUNT ERP → 시스템관리 → API인증현황에서 아래 API를 인증키에 추가:

1. **수주 저장** (SaveSaleOrder) — 영업관리API
2. **판매 저장** (SaveSale) — 영업관리API
3. **매입 저장** (SavePurchases) — 구매관리API
4. **작업지시서** (SaveJobOrder) — 생산API (필요시)
5. **생산불출** (SaveGoodsIssued) — 생산API (필요시)
6. **생산실적** (SaveGoodsReceipt) — 생산API (필요시)
7. **회계전표** (SaveInvoiceAuto) — 회계API (필요시)
8. **쇼핑몰** (SaveOpenMarketOrderNew) — 쇼핑몰API (필요시)

> 수입육 유통 업무 기준, 최소 1~3번(수주/판매/매입)은 필수 인증 필요

### 단기 (P1): MCP 서버 config 정리

현재 `.env`에 `ECOUNT_USER_ID`와 `ECOUNT_API_CERT_KEY` 기본 키가 없어 MCP 서버 시작 불가.
→ PROD 키를 기본값으로 설정하거나 config.ts에서 `_PROD` 접미사 키를 우선 참조하도록 수정 필요.

---

## 검증 도구

```bash
# 샌드박스 (테스트 인증키)
node test-verify-all.mjs test

# 실서버 (운영 인증키)
node test-verify-all.mjs prod
```

---

## 참고: API 사용량 현황 (2026-03-24)

| 제한 | 사용량 | 잔여 |
|------|--------|------|
| 1일 허용량 | ~50건 / 5,000건 | 4,950건 |
| 시간당 오류 | 0건 / 30건 | 30건 |

현재 일일 사용량은 전체 허용량의 1% 수준으로, 대량 자동화에 충분한 여유가 있습니다.
