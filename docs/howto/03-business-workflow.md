# ECOUNT ERP 업무 플로우 — 수입육 유통

> 수집일: 2026-03-24 | 신뢰도 범례: `[V]` VERIFIED, `[I]` INFERRED, `[U]` UNKNOWN

## 전체 업무 흐름도

```mermaid
flowchart TD
    subgraph 구매["1. 구매 프로세스 [V]"]
        PO[발주서 작성] --> EDMS[전자결재]
        EDMS --> SHIP[선적/미착]
    end

    subgraph 입고["2. 입고/통관 프로세스 [V/I]"]
        SHIP --> WH_UNCLEARED["미착 창고 (2x)"]
        WH_UNCLEARED --> CUSTOMS[통관]
        CUSTOMS --> WH_CUSTOMS["미통관 창고 (3x)"]
        WH_CUSTOMS --> CLEAR[통관 완료]
        CLEAR --> WH_PRODUCT["상품 창고 (4x)"]
    end

    subgraph 재고["3. 재고 관리 [V]"]
        WH_PRODUCT --> INV_CHECK[재고 현황 조회]
        INV_CHECK --> INV_LOC[창고별 재고 확인]
    end

    subgraph 판매["4. 판매 프로세스 [V] 622건"]
        INV_CHECK --> QUOTE[견적서 작성]
        QUOTE --> SO[수주 등록]
        SO --> SALE[매출전표 발행]
        SALE --> SHIP_OUT[출고]
    end

    subgraph 회계["5. 회계 처리 [I]"]
        SALE --> INVOICE[세금계산서 발행]
        PO --> PURCHASE_SLIP[매입전표]
    end

    subgraph 생산["6. 생산 관리 [I]"]
        INV_CHECK --> JOB[작업지시]
        JOB --> GI[자재불출]
        GI --> GR[완제품입고]
        GR --> WH_PRODUCT
    end

    subgraph 기타["7. 기타 [I]"]
        SALE --> OPENMARKET[오픈마켓 주문]
        EMP[사원] --> CLOCK[출퇴근 기록]
        BOARD[게시판] --> POST[글 등록]
    end

    style 구매 fill:#e8f5e9
    style 입고 fill:#e3f2fd
    style 재고 fill:#e8f5e9
    style 판매 fill:#e8f5e9
    style 회계 fill:#fff3e0
    style 생산 fill:#fff3e0
    style 기타 fill:#f3e5f5
```

**색상 범례**: 녹색 = VERIFIED (실데이터 확인, 판매 622건 포함), 주황 = INFERRED (스키마 추론), 보라 = INFERRED (독립 기능)

---

## 1. 구매 프로세스 `[VERIFIED]`

실서버 API에서 조회된 발주 데이터 **30건(2024-11 ~ 2025-09)** 기반 업무 흐름입니다.

```mermaid
sequenceDiagram
    participant 담당자 as 담당자 (MJCHOI)
    participant ERP as ECOUNT ERP
    participant 결재 as 전자결재(EDMS)
    participant 공급사 as 오로라/비브라

    담당자->>ERP: 발주서 작성 (ecount_purchase_list_purchase_orders)
    Note right of ERP: PJT_CD: 돈육/계육/CJ-벌크<br/>통화: USD, 인코텀즈: CFR/CIF
    ERP->>결재: 전자결재 요청
    Note right of 결재: EDMS_APP_TYPE=9 (결재완료)
    결재-->>ERP: 결재 승인
    ERP->>공급사: 발주 확정
    Note right of 공급사: P_DES1: 결제조건<br/>100% WIRE TRANSFER AT SIGHT
```

### 발주 데이터에서 확인된 패턴 (30건 분석)

| 패턴 | 증거 |
|------|------|
| 주 거래처: 오로라 (10001) | 30건 중 21건(70%)이 오로라 |
| 보조 거래처: 비브라 | 30건 중 9건(30%), 계육 전문 |
| 외화거래 (USD) | FOREIGN_FLAG=1, EXCHANGE_TYPE=00001 |
| 프로젝트별 관리 | 돈육(00007) 10건, 계육(00003) 15건, CJ벌크(00008) 5건 |
| 계육 비중 증가 추세 | 2025-07 이후 비브라 계육 발주 활발 |
| 전자결재 완료 후 확정 | EDMS_APP_TYPE=9 (전체 발주) |
| 작성자 고정 | WRITER_ID=MJCHOI (전체 발주) |
| 발주 주기 | 월 1~8건, 4월에 대량(8건 $3.57M) |

### 전체 발주 규모 (2024-11 ~ 2025-09)

| 구분 | 값 |
|------|-----|
| 총 발주 건수 | 30건 |
| 총 발주 수량 | 약 2,417톤 (2,417,270 KG) |
| 총 발주 금액 | $6,805,565 (USD) |
| 월 평균 발주 | 4.3건 / $972,224 |

### 거래처별 역할 분담

| 거래처 | 주요 역할 | 발주 비중 | 핵심 품목 |
|--------|----------|----------|-----------|
| 오로라 | 돈육+계육 종합 공급사 | 70% (21건, $6.1M) | 목살, 전지(벌크), 삼겹, 닭다리살 |
| 비브라 | 계육 전문 공급사 | 30% (9건, $0.5M) | 닭발, 닭다리살, 조각정육 |

### 품목 카테고리별 분석

| 카테고리 | 발주 건수 | 주요 품목 | 특징 |
|----------|----------|----------|------|
| 돈육 | 10건 | 목살, 삼겹 | 오로라 단독, 단가 $3.5~3.9/kg |
| CJ-벌크 | 5건 | 전지 (벌크) | 오로라 단독, 대량(1건 35만kg), 단가 $2.6~3.1/kg |
| 계육 | 15건 | 닭다리살, 닭발, 사이즈정육 | 오로라+비브라, 단가 $0.8~2.6/kg |

---

## 2. 재고/물류 프로세스 `[VERIFIED]`

창고별 재고 데이터로 확인된 물류 흐름입니다.

```mermaid
flowchart LR
    A["발주 창고 (10)"] -->|선적| B["미착 창고 (2x)"]
    B -->|도착| C["미통관 창고 (3x)"]
    C -->|통관완료| D["상품 창고 (4x)"]
    D -->|출고| E[("판매/출하")]

    style A fill:#fff3e0
    style B fill:#e3f2fd
    style C fill:#e3f2fd
    style D fill:#e8f5e9
    style E fill:#f3e5f5
```

### 품목 12404 (돈육 목살) 물류 현황

| 단계 | 창고 | 수량 (KG) | 비율 | 상태 |
|------|------|----------|------|------|
| 미착 | 22 (미착_삼진2) | 69,073 | 38.5% | 선적 후 운송중 |
| 미통관 | 32 (미통관_삼진2) | 23,017 | 12.8% | 도착, 통관 대기 |
| 상품 | 42 (상품_삼진2냉장) | 87,485 | 48.7% | 판매 가능 |
| **합계** | | **179,575** | **100%** | |

### 물류 단계 해석
- **48.7%가 상품 창고**: 판매 가능 재고가 절반 가량
- **38.5%가 미착**: 다수의 물량이 운송 중
- **12.8%가 미통관**: 통관 절차 대기 중

---

## 3. 판매 프로세스 `[VERIFIED]` — 622건 실데이터

> 내부 Web API 역공학으로 **622건** 판매 실데이터 확인 (2025-09 ~ 2026-03)
> 엔드포인트: `SelectInventorySearchListAction:sales:list`

```mermaid
flowchart LR
    Q["견적서 3건<br/>(quotation)"] --> SO["수주 0건<br/>(sales_order)"]
    SO --> S["매출 622건<br/>(sales)"]
    S --> INV["세금계산서<br/>(save_invoice_auto)"]
    S --> ACC["회계반영<br/>(conn_acc_slip=Y)"]
```

### 판매 데이터에서 확인된 패턴 (622건 분석)

| 패턴 | 증거 |
|------|------|
| 최대 거래처: 씨제이프레시웨이 | 대량 계육+돈육 거래 |
| 거래처 20+개사 | 엠비케이, 더맛있는하루, 엘에스티씨 등 |
| 주력 출고: 창고 42 (상품_삼진2냉장) | 622건 중 대다수 |
| 보조 출고: 창고 43 (상품_동일냉장) | |
| CJ벌크 전용: 창고 44 (일죽창고) | |
| 거래유형: 면세 (코드 12) | 전체 판매 면세 거래 |
| 회계 자동 반영 | `conn_acc_slip = "Y"` |
| 작성자: JYOH (일반), MJCHOI (CJ벌크) | 업무 분담 확인 |
| 전자결재 연동 | `edms$edms$edms_date` 필드 존재 |
| 프로젝트별 관리 | 돈육(00007), 계육(00003) 분류 |

### 견적→수주→매출 데이터 흐름

| 단계 | 확인 건수 | 핵심 필드 | 데이터 소스 |
|------|----------|----------|------------|
| 견적 | **3건** | CUST, PROD_CD, QTY, PRICE | 내부 API `[V]` |
| 수주 | **0건** | CUST, PROD_CD, QTY, WH_CD | 내부 API `[V]` |
| 매출 | **622건** | CUST, PROD_CD, QTY, WH_CD, TRX_TYPE | 내부 API `[V]` |
| 계산서 | 미확인 | CUST, UPLOAD_SER_NO | `[I]` 스키마 추론 |

> 수주 0건 → 견적→매출 직행 패턴 (수주 단계 미사용)

### 판매 프로세스에서 사용되는 공통 키

| 키 | 역할 | 연결 엔티티 | 검증 상태 |
|----|------|------------|----------|
| CUST / inv_s$cust_nm | 거래처 | CUSTOMER 마스터 | `[V]` 20+개사 |
| PROD_CD / inv_s$prod_summary | 품목 | PRODUCT 마스터 | `[V]` |
| WH_CD / inv_s$wh_cd | 출고창고 | WAREHOUSE (42/43/44) | `[V]` |
| PJT_CD / inv_s$pjt_cd | 프로젝트 | PROJECT | `[V]` |
| UPLOAD_SER_NO | 전표번호 | 견적→매출 추적 | `[I]` |

---

## 4. 생산 프로세스 `[INFERRED]`

> Save 도구(ecount_production_save_job_order, ecount_production_save_goods_issued, ecount_production_save_goods_receipt) 스키마에서 추론

```mermaid
flowchart LR
    JO["작업지시<br/>(save_job_order)"] --> GI["자재불출<br/>(save_goods_issued)"]
    GI --> GR["완제품입고<br/>(save_goods_receipt)"]
```

| 단계 | 도구 | 핵심 필드 | 의미 |
|------|------|----------|------|
| 작업지시 | `save_job_order` | PROD_CD, QTY, WH_CD, EMP_CD | 생산 계획 수립 |
| 자재불출 | `save_goods_issued` | PROD_CD, QTY, WH_CD | 원자재 출고 |
| 완제품입고 | `save_goods_receipt` | PROD_CD, QTY, WH_CD | 완성품 입고 |

---

## 5. 회계 프로세스 `[INFERRED]`

| 구분 | 도구 | 설명 |
|------|------|------|
| 매입전표 | `save_purchase` | 구매 거래 회계 처리 |
| 세금계산서 | `save_invoice_auto` | 매출/매입 세금계산서 자동 발행 |

---

## 6. 기타 업무 `[INFERRED]`

| 업무 | 도구 | 용도 |
|------|------|------|
| 오픈마켓 | `save_open_market_order` | 외부 쇼핑몰 주문 ERP 연동 |
| 근태관리 | `save_clock_in_out` | 출퇴근 기록 |
| 게시판 | `create_board` | 사내 게시판 (V3 API) |

---

## 업무 흐름 요약 — 수입육 유통 전체 사이클

```mermaid
flowchart TD
    subgraph 외부["해외 공급사"]
        AURORA["오로라 (10001)<br/>돈육+계육 70%"]
        VIBRA["비브라<br/>계육 전문 30%"]
    end

    subgraph 구매["① 구매/발주 [V] 30건"]
        PO["발주서 작성<br/>Open API 조회 가능"]
        EDMS["전자결재 (EDMS=9)"]
    end

    subgraph 물류["② 수입 물류 [V]"]
        WH10["발주 창고 (10)"]
        WH2X["미착 창고 (2x)<br/>38.5% 재고"]
        WH3X["미통관 창고 (3x)<br/>12.8% 재고"]
        WH4X["상품 창고 (4x)<br/>48.7% 재고"]
    end

    subgraph 재고["③ 재고 관리 [V] 1,358톤"]
        INV["재고 조회 4종<br/>Open API 완전 지원"]
    end

    subgraph 판매["④ 판매 [V] 622건"]
        QUOTE["견적 3건 ✅"]
        SO["수주 0건 ✅ (미사용)"]
        SALE["매출 622건 ✅<br/>내부 API 조회"]
    end

    subgraph 매입["⑤ 구매(매입) [V] 261건"]
        PURCHASE["매입 261건 ✅<br/>내부 API 조회"]
    end

    subgraph 회계["⑥ 회계 [I]"]
        INVOICE["세금계산서 (미확인)"]
    end

    AURORA --> PO
    VIBRA --> PO
    PO --> EDMS
    EDMS --> WH10
    WH10 -->|선적| WH2X
    WH2X -->|도착| WH3X
    WH3X -->|통관완료| WH4X
    WH4X --> INV
    INV --> QUOTE
    QUOTE --> SO
    SO --> SALE
    SALE --> INVOICE
    PO --> PURCHASE

    style 외부 fill:#e3f2fd
    style 구매 fill:#e8f5e9
    style 물류 fill:#e8f5e9
    style 재고 fill:#e8f5e9
    style 판매 fill:#e8f5e9
    style 매입 fill:#e8f5e9
    style 회계 fill:#fff3e0
```

| 전체 사이클 단계 | 관찰 가능 여부 | 데이터 소스 | 건수 |
|----------------|---------------|------------|------|
| 1. 발주서 작성 | `[V]` 조회+저장 | Open API list_purchase_orders | 30건 |
| 2. 선적/미착 | `[V]` 재고로 확인 | Open API list_inventory_by_location | |
| 3. 통관 | `[V]` 재고로 확인 | Open API list_inventory_by_location | |
| 4. 상품 입고 | `[V]` 재고로 확인 | Open API list_inventory_balance | 1,358톤 |
| 5. 견적/수주 | **`[V]`** 조회 가능 | 내부 API quotation/sales_order | 3건/0건 |
| 6. 매출/출고 | **`[V]`** 622건 확인 | 내부 API sales:list | **622건** |
| 7. 세금계산서 | `[I]` 미확인 | (미캡처) | |
| 8. 매입전표 | **`[V]`** 261건 확인 | 내부 API purchases:list | **261건** |
