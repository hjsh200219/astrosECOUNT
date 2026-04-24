# ECOUNT Internal Web API — 역공학 분석

> 수집일: 2026-03-24 (2차 캡처 완료) | Playwright MCP로 웹 UI 네트워크 요청 캡처
> 상태: 종합 분석 완료 — V5 app API 9개 엔드포인트 + V3 Legacy 6개 메뉴 확인

## 1. 개요

ECOUNT Open API V2/V3는 전체 웹 기능의 약 17%만 커버합니다.
웹 UI에서 사용하는 **내부 API**를 역공학하여, 공식 API로 불가능한 조회 기능을 구현할 수 있는지 분석했습니다.

### Open API vs 내부 API 비교

| 구분 | Open API V2 | 내부 Web API |
|------|------------|-------------|
| 인증 | `SESSION_ID` (OAPILogin) | `ec_req_sid` (웹 로그인) |
| 호스트 | `oapi{ZONE}.ecount.com` | `login{ZONE}.ecount.com` |
| 인코딩 | JSON (일반) | `__$KeyPack` 압축 JSON |
| 응답 | JSON (일반) | Base64 인코딩 + `__$KeyPack` |
| 조회 | 품목, 재고, 발주 (3종) | **V5 app API 9종** + V3 Legacy 다수 (판매 622, 구매 261, 세금계산서 147, 회계전표 1,609건 확인) |
| Rate Limit | 명시적 (1/1s, 5000/day) | 불명확 (세션 기반) |
| 안정성 | 공식 지원 | 비공식 (언제든 변경 가능) |

---

## 2. 내부 API 엔드포인트 패턴

### URL 구조

```
POST https://login{ZONE}.ecount.com/ec5/api/app.{MODULE}/action/{ACTION_NAME}:{BIZZ}:{TYPE}?ec_req_sid={SESSION_ID}&xce=none
```

| 파라미터 | 설명 | 예시 |
|----------|------|------|
| `{ZONE}` | 서버 존 | `aa` (한국) |
| `{MODULE}` | 모듈명 | `inventory`, `account`, `vatslip`, `tax` |
| `{ACTION_NAME}` | 액션 | `SelectInventorySearchListAction` 등 (§2.2 참조) |
| `{BIZZ}` | 업무 유형 | `sales`, `purchases`, `quotation`, `account_slip` 등 |
| `{TYPE}` | 화면 유형 | `list`, `bal_process` 등 |
| `{SESSION_ID}` | 웹 세션 | `AA-ETJ3Epp5X6Ozq` |

### 2.2 확인된 V5 app API 엔드포인트 (전체)

#### 데이터 조회 액션 (Select)

| 모듈 | 액션명 | bizz_type | bizz_sid | 확인 건수 |
|------|--------|-----------|----------|----------|
| `app.inventory` | `SelectInventorySearchListAction` | `sales` | `B_000000E040205` | **622건** |
| `app.inventory` | `SelectInventorySearchListAction` | `purchases` | `B_000000E040303` | **261건** |
| `app.inventory` | `SelectInventorySearchListAction` | `quotation` | `B_000000E040201` | **3건** |
| `app.inventory` | `SelectInventorySearchListAction` | `sales_order` | `B_000000E040203` | **0건** |
| `app.vatslip` | `SelectVatSlipListAction` | `vatslipkor` | `B_000000E010727` | **147건** |
| `app.account` | `SelectAccountSearchListAction` | `account_slip` | — | **1,609건** |
| `app.account` | `SelectAccountSearchBalProcessAction` | `account_bond` | — | **0건** |
| `app.account` | `SelectAccountSearchBalProcessAction` | `account_debt` | — | **0건** |
| `app.tax` | `SelectVatfilingListAction` | `vat_filing` | `B_000000E030215` | **1건** |

#### 설정/데이터 보조 액션

| 모듈 | 액션명 | 용도 |
|------|--------|------|
| `app.inventory` | `GetInventoryDataAction` | 화면 설정 데이터 |
| `app.inventory` | `GetInventorySetupAction` | UI 레이아웃/컬럼 설정 |
| `app.inventory` | `GetInventorySetupCachePrepareAction` | 캐시 키 생성 |
| `app.account` | `GetAccountDataAction` | 회계 화면 설정 데이터 |
| `app.account` | `GetAccountSetupAction` | 회계 UI 레이아웃 |
| `app.account` | `GetAccountSetupCachePrepareAction` | 회계 캐시 키 생성 |
| `app.vatslip` | `GetVatSlipDataAction` | 세금계산서 설정 데이터 |
| `app.vatslip` | `GetVatSlipSetupAction` | 세금계산서 UI 레이아웃 |
| `app.tax` | `GetVatfilingDataAction` | 부가세 설정 데이터 |
| `app.tax` | `GetVatfilingSetupAction` | 부가세 UI 레이아웃 |
| `app.tax` | `GetVatfilingListDataAction` | 부가세 목록 데이터 |
| `app.tax` | `GetVatfilingListSetupAction` | 부가세 목록 UI |
| `app.common` | `GetBizzAction` | 업무 로직 데이터 |
| `app.common` | `GetBizzCachePrepareAction` | 업무 캐시 준비 |

### 2.3 V3 Legacy SSR 메뉴 (fetch 인터셉션 불가)

| 메뉴 | 페이지 ID | 데이터 건수 | 비고 |
|------|-----------|-----------|------|
| 거래처리스트 | `ESA001M` | ~320건 (13페이지) | 기초등록 |
| 품목등록리스트 | `ESA009M` | ~29건 (2페이지) | 기초등록 |
| 발주서조회 | `ESG005M` | ~30건 | 구매관리 |
| 작업지시서조회 | `ESJ005M` | 0건 | 생산/외주 |
| 생산입고조회 | `ESJ010M` | 0건 | 생산/외주 |
| 일별이익현황 | `ESS015R` | — | 재고 II |
| 출력물 | `EBZ001M` | — | 회계 I |

> **V3 Legacy SSR 특징**: 서버에서 HTML을 완성하여 전달. `fetch`/`XHR` 인터셉션으로 데이터 캡처 불가.
> Open API V2의 `ListProduct`, `GetPurchasesOrderList` 등이 이 영역을 일부 커버.

### 인증 (웹 로그인)

```
POST https://login.ecount.com/Login/Login2
Content-Type: application/x-www-form-urlencoded

COM_CODE=635188&USER_ID=astroscorp&USER_PASSWD=!ast001570
```

로그인 후 쿠키에서 `ec_req_sid` 추출 → 모든 내부 API 요청에 사용

---

## 3. 요청 형식 — `__$KeyPack` 압축

ECOUNT 내부 API는 대역폭 절약을 위해 JSON 키를 **hex 인덱스**로 압축합니다.

### 구조

```json
["__$KeyPack",
  {"00": "field_name_1", "01": "field_name_2", ...},  // 키 매핑 (사전)
  {"00": "value_1", "01": "value_2", ...}              // 실제 데이터
]
```

### 판매 조회 요청 예시 (해독 후)

```json
{
  "menu_type": "list",
  "bizz_sid": "B_000000E040205",
  "page": {"current_index": 1, "row_count": 26},
  "limit": 5000,
  "condition": {
    "inv_s$data_dt": {
      "type": "range",
      "value": {"from": "20250925", "to": "20260423"}
    },
    "inv_s$status_type": {
      "type": "contains",
      "value": ["U"]
    },
    "inv_s$trx_type": {"type": "contains", "value": []},
    "inv_s$cust": {"type": "contains", "value": []},
    "inv_m$prod": {"type": "contains", "value": []},
    "inv_s$wh": {"type": "contains", "value": []},
    "inv_s$pjt": {"type": "contains", "value": []}
  },
  "current_template": "SR030_CRM000001",
  "template_sub_type": "fixed",
  "menu_sid": "M_000000E040206"
}
```

### 핵심 파라미터

| 파라미터 | 설명 | 필수 |
|----------|------|------|
| `bizz_sid` | 업무 식별자 | ✅ `B_000000E040205` (판매) |
| `menu_sid` | 메뉴 식별자 | ✅ `M_000000E040206` (판매조회) |
| `page.current_index` | 현재 페이지 | ✅ 1부터 시작 |
| `page.row_count` | 페이지당 건수 | ✅ 26 (기본값) |
| `condition.inv_s$data_dt` | 기준일자 범위 | ✅ YYYYMMDD |
| `condition.inv_s$status_type` | 상태 필터 | `["U"]` = 전체 |
| `current_template` | 양식 ID | ✅ 사용자별 상이 |
| `template_sub_type` | 양식 타입 | `"fixed"` |

---

## 4. 응답 형식

### 응답 디코딩 과정

1. 서버 응답 = Base64 문자열
2. Base64 디코딩 → JSON 문자열
3. JSON 파싱 → `__$KeyPack` 구조
4. 키 매핑 해독 → 실제 데이터

### 판매 조회 응답 구조

```json
{
  "Status": 200,
  "EnableNoL4": false,
  "RefreshTimestamp": "639094116244616044:1",
  "UtcOffeset": -540,
  "Data": ["__$KeyPack",
    {"00": "total_count", "01": "data", "02": "log"},
    {
      "00": 622,                // 전체 622건
      "01": ["__$KeyPack",
        {"00": "inv_s$hid", "01": "inv_s$data_dt", ...},  // 필드 매핑
        {"00": 1267321, "01": "20260327", ...},            // 레코드 1
        {"00": 1267049, "01": "20260316", ...},            // 레코드 2
        ...
      ]
    }
  ]
}
```

### 판매 데이터 필드 매핑 (37개)

| KeyPack 키 | 필드명 | 설명 | 예시값 |
|------------|--------|------|--------|
| `00` | `inv_s$hid` | 내부 ID | `1267321` |
| `01` | `inv_s$data_dt` | 전표일자 | `"20260327"` |
| `02` | `inv_s$data_no` | 전표번호 | `2` |
| `03` | `inv_s$data_sid` | 데이터 SID | `"838T8EW78644DWO"` |
| `04` | `inv_s$record_sid` | 레코드 SID | `"838T8EW78644DWN"` |
| `06` | `inv_s$bizz_sid` | 업무 SID | `"B_000000E040205"` |
| `07` | `inv_s$confirm_type` | 확인상태 | `"Y"` |
| `08` | `inv_s$exchange_rate` | 환율 | `"¬N:0.00¬"` |
| `09` | `inv_s$foreign_currency_cd` | 외화코드 | `""` (내자) |
| `0A` | `inv_s$foreign_currency_tf` | 외화여부 | `false` |
| `0C` | `inv_s$pic_cd` | 담당자코드 | `""` |
| `0D` | `inv_s$pjt_cd` | 프로젝트코드 | `"00007"` |
| `0K` | `inv_s$supply_amt` | 공급가액 | `"¬N:28801200.00¬"` |
| `0L` | `inv_s$title` | 제목 | `"2026/03/17 -1 지에스미트"` |
| `0N` | `inv_s$trx_type_cd` | 거래유형코드 | `"12"` (면세) |
| `0O` | `inv_s$update_sid` | 수정자 | `"JYOH"` |
| `0P` | `inv_s$vat_amt` | 부가세액 | `"¬N:0.00¬"` |
| `0R` | `inv_s$wh_cd` | 창고코드 | `"42"` |
| `0S` | `inv_s$write_sid` | 작성자 | `"JYOH"` |
| `0T` | `edms$edms$edms_date` | 전자결재일 | `"20260313"` |
| `0U` | `inv_s$conn_acc_slip` | 회계반영여부 | `"Y"` |
| `0W` | `inv_s$data_dt_no` | 일자-번호 | `"20260317-1"` |
| `0X` | `inv_s$mail_send_tf` | 거래명세서발송 | `true` |
| `0Y` | `inv_s$fax_send_tf` | FAX발송 | `true` |
| `0Z` | `inv_s$cust_nm` | 판매처명 | `"지에스미트"` |
| `0a` | `inv_s$prod_summary` | 품명요약 | `"오로라 냉동 돈육 삼겹 [56552D]"` |
| `0b` | `inv_s$qty` | 수량(KG) | `"¬N:3600.15¬"` |
| `0c` | `inv_s$amt` | 금액합계 | `"¬N:28801200.00¬"` |
| `0d` | `inv_s$trx_type_nm` | 거래유형명 | `"면세"` |
| `0e` | `wh$wh$wh_des` | 창고명 | `"상품_삼진2냉장"` |
| `0f` | `inv_s$slip_link_cnt` | 연결전표수 | `0` |
| `0g` | `inv_s$pjt_nm` | 프로젝트명 | `"수입육 (돈육)"` |
| `0h` | `inv_s$lately_id` | 최근수정자 | `"최민지(MJCHOI)"` |
| `0i` | `inv_s$lately_date` | 최근수정일 | `"¬D:2026-03-13T01:02:41.414Z¬"` |

### 특수 값 형식

| 패턴 | 의미 | 예시 |
|------|------|------|
| `¬N:123.45¬` | 숫자 | `¬N:3600.1500000000¬` → `3600.15` |
| `¬D:2026-03-13T01:02:41Z¬` | 날짜/시간 | ISO 8601 UTC |
| `"Y"` / `"N"` | 문자열 Boolean | 확인/미확인 |
| `true` / `false` | Boolean | 발송/미발송 |

---

## 5. 확인된 데이터 요약

### 5.1 V5 app API — 캡처 완료 (9개 엔드포인트)

| # | 메뉴 | 모듈 | bizz_type | 확인 건수 | 신뢰도 |
|---|------|------|-----------|----------|--------|
| 1 | 판매조회 | `app.inventory` | `sales:list` | **622건** | `[V]` |
| 2 | 구매조회 | `app.inventory` | `purchases:list` | **261건** | `[V]` |
| 3 | 견적서조회 | `app.inventory` | `quotation:list` | **3건** | `[V]` |
| 4 | 주문서조회 | `app.inventory` | `sales_order:list` | **0건** | `[V]` |
| 5 | 세금계산서 | `app.vatslip` | `vatslipkor:list` | **147건** | `[V]` |
| 6 | 회계거래조회 | `app.account` | `account_slip:list` | **1,609건** | `[V]` |
| 7 | 채권관리 | `app.account` | `account_bond:bal_process` | **0건** | `[V]` |
| 8 | 채무관리 | `app.account` | `account_debt:bal_process` | **0건** | `[V]` |
| 9 | 부가세신고서 | `app.tax` | `vat_filing:list` | **1건** | `[V]` |

### 5.2 V3 Legacy SSR — 직접 API 호출 불가 (6개 메뉴)

| 메뉴 | 페이지 ID | 데이터 건수 | Open API 대체 |
|------|-----------|-----------|--------------|
| 거래처리스트 | `ESA001M` | ~320건 | ❌ 없음 |
| 품목등록리스트 | `ESA009M` | ~29건 | ✅ `ListProduct` |
| 발주서조회 | `ESG005M` | ~30건 | ✅ `GetPurchasesOrderList` |
| 작업지시서조회 | `ESJ005M` | 0건 | ❌ 없음 |
| 생산입고조회 | `ESJ010M` | 0건 | ❌ 없음 |
| 일별이익현황 | `ESS015R` | — | ❌ 없음 |

> 판매/구매 실데이터 분석 결과는 [01-data-catalog.md](01-data-catalog.md)를 참조하세요.

### 5.3 세금계산서 필드 매핑 (80+ 필드)

| 카테고리 | 주요 필드 |
|----------|----------|
| 핵심 데이터 | `data_dt_no`, `cust_nm`, `supply_amt`, `vat_amt`, `total`, `taxbill_type`, `vat_type_cd` |
| 상태 | `confirm_type`, `transmit_status_type`, `mail_send_status_type`, `progress_status_type` |
| 연결 | `approve_no`, `dept`, `pjt`, `cust_sid`, `bizz_sid`, `trx_conn_sid` |
| 조인 | `acc_slip$acc_slip$*` (회계전표), `cust$cust$business_no`, `pjt$pjt$pjt_cd` |

### 5.4 매출전표(회계거래) 필드 매핑 (30 필드)

| 카테고리 | 주요 필드 |
|----------|----------|
| 핵심 데이터 | `data_dt_no`, `acctmenu_type`, `trx_amt_t`, `cust_nm`, `remark` |
| 상태 | `confirm_type`, `status_type`, `io_type` |
| 연결 | `acc_slip_sid`, `bizz_sid`, `inv_data_dt/no`, `ser_no`, `ver_no` |
| 조인 | `pjt$pjt$pjt_des`, `dept$dept$site_des`, `manage_no$manage_no$trade_name` |

### 5.5 부가세신고서 필드 매핑 (25 필드)

| 카테고리 | 주요 필드 |
|----------|----------|
| 핵심 | `vfiling_b$vat_doc_sid`, `vfiling_b$bizz_man_register_no`, `vfiling_b$data_create_type` |
| 기간 | `vfiling_b$declare_start_yyyymm`, `vfiling_b$declare_end_yyyymm` |
| 사업장 | `business_site$head_business_site$com_code`, `$business_no`, `$com_des`, `$boss_name` |

---

## 6. 웹 UI 아키텍처 분류

ECOUNT 웹 UI는 **두 가지 아키텍처**가 공존합니다:

### V5 App API (신규 — 캡처 가능)

```
┌─────────────────────┐     fetch()      ┌──────────────────────────────┐
│  브라우저 (React)    │ ──────────────→  │ /ec5/api/app.{MODULE}/action │
│  SPA, 클라이언트     │ ←────────────── │  Base64(__$KeyPack JSON)     │
│  렌더링              │   JSON response  └──────────────────────────────┘
└─────────────────────┘
```

- **대상**: 판매, 구매, 견적, 주문, 세금계산서, 회계전표, 채권/채무, 부가세
- **인터셉션**: `window.fetch` monkey-patching으로 캡처 가능
- **MCP 구현**: KeyPack 인코더/디코더로 직접 API 호출 가능

### V3 Legacy SSR (구형 — 캡처 불가)

```
┌─────────────────────┐   POST (form)    ┌──────────────────────────────┐
│  브라우저            │ ──────────────→  │ 서버: ESA001M, ESG005M 등    │
│  서버 렌더링 HTML    │ ←────────────── │  완성된 HTML 반환            │
│  테이블 직접 출력    │   HTML response  └──────────────────────────────┘
└─────────────────────┘
```

- **대상**: 기초등록(거래처, 품목), 발주서, 생산/외주, 재고 II 현황
- **인터셉션**: 불가 (데이터가 HTML에 포함)
- **대안**: Open API V2 (품목, 발주서) 또는 Playwright DOM 스크래핑

---

## 7. 구현 전략

### Option A: 직접 내부 API 호출 (권장 X)

```typescript
// 위험: 비공식 API, 언제든 변경 가능
const response = await fetch(
  `https://loginaa.ecount.com/ec5/api/app.inventory/action/SelectInventorySearchListAction:sales:list?ec_req_sid=${sessionId}&xce=none`,
  {
    method: 'POST',
    body: encodeKeyPack(requestData)  // __$KeyPack 인코딩 필요
  }
);
const decoded = decodeKeyPack(atob(await response.text()));
```

**장점**: 빠르고 효율적
**단점**: KeyPack 인코딩/디코딩 구현 필요, API 변경 시 즉시 깨짐

### Option B: Playwright 자동화 (권장)

```typescript
// 안전: 실제 웹 UI를 자동화, UI가 변경되지 않는 한 동작
const browser = await chromium.launch();
const page = await browser.newPage();
await login(page, credentials);
await navigateToSales(page);
const data = await interceptApiResponse(page, 'SelectInventorySearchListAction');
```

**장점**: UI 변경에 강건, 인코딩 처리 불필요 (브라우저가 자동 처리)
**단점**: 느림 (브라우저 필요), 리소스 소비 큼

### Option C: 하이브리드 (최적)

1. **Playwright로 로그인** → `ec_req_sid` 획득
2. **직접 API 호출**로 데이터 조회 (KeyPack 라이브러리 구현)
3. **응답 디코딩** → 구조화된 데이터
4. **MCP Tool로 노출** → Claude에서 자연어로 조회 가능

---

## 8. 리스크 및 주의사항

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| API 엔드포인트 변경 | 높음 | 버전 감지 및 폴백 |
| KeyPack 형식 변경 | 중간 | 동적 키 매핑 사용 |
| 세션 만료 (짧은 TTL) | 중간 | 자동 재로그인 |
| 계정 잠금/차단 | 높음 | 요청 간격 제어, 사용 패턴 자제 |
| 법적 이슈 (ToS 위반) | 중간 | 자사 데이터만 접근, 과도한 자동화 자제 |
| ECOUNT 업데이트로 깨짐 | 높음 | 헬스체크 + 알림 |

---

## 9. 다음 단계

### 탐색 완료 ✅
- [x] 판매/구매/견적/주문서 내부 API 캡처 (1차)
- [x] 세금계산서 내부 API 캡처 (`app.vatslip`)
- [x] 매출전표/회계거래 내부 API 캡처 (`app.account`)
- [x] 채권/채무 관리 내부 API 캡처 (`app.account`)
- [x] 부가세신고서 내부 API 캡처 (`app.tax`)
- [x] V3 Legacy 메뉴 아키텍처 분류 (기초등록, 생산, 발주서, 재고 II)

### 구현 로드맵
- [ ] **P0**: KeyPack 인코더/디코더 TypeScript 라이브러리 구현
- [ ] **P0**: 웹 로그인 → `ec_req_sid` 자동 획득 모듈
- [ ] **P1**: 판매 조회 MCP Tool 구현 (`ecount_list_sales`)
- [ ] **P1**: 구매 조회 MCP Tool 구현 (`ecount_list_purchases`)
- [ ] **P1**: 세금계산서 조회 MCP Tool 구현 (`ecount_internal_list_vatslips`)
- [ ] **P1**: 회계전표 조회 MCP Tool 구현 (`ecount_internal_list_account_slips`)
- [ ] **P2**: 채권/채무 조회 MCP Tool 구현
- [ ] **P2**: 부가세신고서 조회 MCP Tool 구현
- [ ] **P2**: 세션 관리 및 자동 재로그인
- [ ] **P3**: 거래처 목록 DOM 스크래핑 (V3 Legacy 대안)
