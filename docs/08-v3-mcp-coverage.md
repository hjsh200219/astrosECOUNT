# 08. v3 구성안 MCP 커버리지 분석

> ASTROS 수입육 통합관리시스템 v3.0 구성안의 각 요구사항이 현재 MCP 도구로 얼마나 커버되는지 분석한 문서입니다.
>
> 기준일: 2026-03-25 | MCP 도구 총 38개 기준

---

## 범례

| 기호 | 의미 |
|------|------|
| ✅ | MCP 도구로 구현 완료 |
| 🟡 | 기본 도구 존재, 확장/조합 필요 |
| ❌ | 미구현 (신규 개발 필요) |
| ⬜ | MCP 범위 밖 (프론트엔드 UI 등) |

---

## 1. 핵심 변경점 (v2 → v3)

| # | 항목 | v3 요구사항 | MCP 도구 | 상태 |
|---|------|-----------|---------|------|
| ① | 계약서 회신 | 디지털 직인 자동 날인 + 회신 메일 초안 자동 작성 | `ecount_stamp_pdf` + `ecount_render_email` | ✅ |
| ② | 메일 자동화 | 15개 표준 메일 템플릿, 모든 업무 메일 자동 초안 | `ecount_list_email_templates`, `ecount_get_email_template`, `ecount_render_email` | ✅ |
| ③ | 모니터링 | 비주얼 파이프라인 뷰 (칸반 스타일 실시간 추적) | 없음 — 프론트엔드 UI 영역 | ⬜ |
| ④ | 원클릭 처리 | 통관요청·서류전달·원본요청·출고·검역증전달 등 6개 | 개별 도구 조합으로 백엔드 가능, 오케스트레이션은 UI | 🟡 |
| ⑤ | 메일 표준화 | 15개 표준 템플릿 + 데이터 자동 매핑 | `ecount_render_email` (변수 자동 치환) | ✅ |
| ⑥ | 수동 오버라이드 | 환율/ETA/관세 등 수동 입력·조정 | `ecount_set_exchange_rate` 구현, ETA·관세는 미흡 | 🟡 |
| ⑦ | 자가진단 | 헬스 모니터링 + 오류 감지 + 자동 수정 + 일일 리포트 | `ecount_daily_report`, `ecount_verify_inventory`, `ecount_stale_shipments` | 🟡 |
| ⑧ | BI 대시보드 | 수입추이·판매추이·마진분석·재고회전율 실시간 | `ecount_calc_logistics_kpi` + 내부 API 조회 도구들 | 🟡 |

---

## 2. 메일 분석 & 자동화 맵

| 요구사항 | MCP 도구 | 상태 |
|---------|---------|------|
| 담당자/역할 DB (11명) | `ecount_lookup_contact`, `ecount_list_contacts` | ✅ |
| BL 패턴 파싱 (COSCO, ONE, HMM, MSC, Evergreen, PIL 등 7개 선사) | `ecount_parse_bl` | ✅ |
| 관세법인 자동 배정 (전지벌크→원스탑, 기타→정운) | `ecount_get_customs_broker` | ✅ |
| 창고 자동 배정 (제품+판매처 기반) | `ecount_get_warehouse_mapping` | ✅ |
| 15개 정형 메일 유형 (EM-01 ~ EM-15) | `ecount_render_email` (템플릿 기반 렌더링) | ✅ |

---

## 3. 비주얼 모니터링 시스템

| 요구사항 | MCP 도구 | 상태 |
|---------|---------|------|
| 칸반 파이프라인 뷰 (7단계) | 없음 — 프론트엔드 UI | ⬜ |
| 컨테이너 상태별 조회/필터 | `ecount_list_shipments` (status 필터링) | ✅ |
| 컨테이너 상세 정보 | `ecount_get_shipment` | ✅ |
| 알림 배지 (긴급/주의) | `ecount_stale_shipments` (체화 감지) | 🟡 |
| 실시간 검색 (BL번호, 계약번호) | `ecount_parse_bl` + `ecount_get_shipment` | ✅ |
| 타임라인 (단계별 소요일) | `ecount_calc_logistics_kpi` | ✅ |

---

## 4. 원클릭 처리 (Click-to-Process) 6개 워크플로우

> 원클릭 처리는 **MCP 도구 조합**으로 백엔드 로직을 커버합니다. UI 오케스트레이션은 프론트엔드 영역입니다.

| # | 워크플로우 | 사용 MCP 도구 | 상태 |
|---|-----------|-------------|------|
| 1️⃣ | 통관 요청 (Click-to-Clear) | `ecount_get_customs_broker` → `ecount_render_email(TPL-CUSTOMS-01)` | ✅ |
| 2️⃣ | 선적서류 전달 (Click-to-Forward) | `ecount_parse_bl` → `ecount_render_email(TPL-SHIP-01)` + `ecount_render_email(TPL-SHIP-02)` | ✅ |
| 3️⃣ | 원본서류 요청 (Click-to-Request) | `ecount_render_email(TPL-DOCS-01)` (PT-BR 포르투갈어) | ✅ |
| 4️⃣ | 계약서 직인 회신 (Click-to-Sign) | `ecount_stamp_pdf` → `ecount_render_email(TPL-CONTRACT-01)` | ✅ |
| 5️⃣ | 출고 처리 (Click-to-Deliver) | `ecount_render_email(TPL-DELIVERY-01/02)` | 🟡 FAX 발송 미구현 |
| 6️⃣ | 통관서류 전달 (Click-to-Distribute) | `ecount_render_email(TPL-CUSTOMS-02)` + `ecount_lookup_contact` | ✅ |

---

## 5. 표준 메일 템플릿 15종

> 모든 템플릿은 `ecount_render_email` 도구를 통해 변수 자동 치환 후 렌더링됩니다.

| 템플릿 ID | 메일 유형 | 자동 매핑 데이터 소스 | 상태 |
|----------|---------|-------------------|------|
| TPL-SHIP-01 | 선적서류 → 삼현INT | BL번호, 제품, 창고, 관세법인 | ✅ |
| TPL-SHIP-02 | 선적서류 → 정운관세법인 | BL번호, 제품, 통관 대상 | ✅ |
| TPL-CONTRACT-01 | 계약서 직인 서명 회신 (영문) | 계약번호, 담당자명 | ✅ |
| TPL-CONTRACT-02 | 판매처 계약정보 전달 | 계약정보, 판매처 | ✅ |
| TPL-DOCS-01 | 원본서류 요청 (포르투갈어) | 계약번호, BL, ETA, 입항 | ✅ |
| TPL-DOCS-02 | 검역증 전달 | BL번호, 관세법인 | ✅ |
| TPL-DOCS-03 | OBL 전달 (선사→포워더) | BL번호, 입항일 | ✅ |
| TPL-DOCS-04 | 누락서류 재요청 | 미비 서류 목록 | ✅ |
| TPL-CUSTOMS-01 | 통관 요청 | BL, 제품, 입항일, 창고 | ✅ |
| TPL-CUSTOMS-02 | 통관서류 전달 (확인증/필증) | BL번호, 판매처 | ✅ |
| TPL-ALERT-01 | 입항/ETA 변경 통보 | ETA 변경 내역 | ✅ |
| TPL-ALERT-02 | 입항 D-3 사전 통보 | ETA, 관세법인, 창고 | ✅ |
| TPL-DELIVERY-01 | 출고지시서 + 창고 통보 | 출고 정보, 창고 | ✅ |
| TPL-DELIVERY-02 | 판매처 출고 통보 | 출고 정보, 판매처 | ✅ |
| TPL-SCHEDULE-01 | 선적스케줄 확인 요청 (포르투갈어) | 계약번호, 선적일 | ✅ |

---

## 6. 자가진단 엔진 (3계층)

| 계층 | 검증 항목 | MCP 도구 | 상태 |
|-----|---------|---------|------|
| **L1: 인프라** | 웹서버 상태 (30초 ping) | `ecount_status` (API 연동 상태) | 🟡 |
| | DB 연결 상태 | 없음 | ❌ |
| | API 연동 상태 (MS Graph, 선사, 환율, FAX) | `ecount_status` (부분) | 🟡 |
| | 디스크/메모리 사용량 | 없음 — 인프라 영역 | ⬜ |
| **L2: 데이터** | 계약DB ↔ 선적DB 매칭 검증 | `ecount_verify_inventory` (재고 검증만) | 🟡 |
| | 재고 3단계 합계 검증 | `ecount_verify_inventory` | ✅ |
| | 환율 적용 검증 (BL date 환율 누락) | `ecount_list_exchange_rates` | 🟡 |
| | 통관 후 관세 미반영 검출 | 없음 | ❌ |
| | 기초재고 ↔ 전월 기말재고 일치 | 없음 | ❌ |
| | OneDrive 폴더 ↔ DB 매칭 | 없음 — 외부 서비스 | ⬜ |
| **L3: 프로세스** | 메일 자동감지 누락 | 없음 — 메일 수신 영역 | ⬜ |
| | 선박 트래킹 미갱신 (24h+) | `ecount_stale_shipments` | ✅ |
| | 서류 체크리스트 미완료 | 없음 | ❌ |
| | 통관 지연 (입항 후 7일+) | `ecount_stale_shipments` (조건 확장 필요) | 🟡 |
| | 출고 미처리 (판매 후 3일+) | 없음 | ❌ |
| **리포트** | 일일 헬스 리포트 (AM 8:00) | `ecount_daily_report` | ✅ |

---

## 7. BI 대시보드 데이터 소스

| 대시보드 섹션 | 필요 데이터 | MCP 데이터 소스 | 상태 |
|-------------|-----------|---------------|------|
| 수입 추이 | 월별 수입량/금액, 공급업체별 비중 | `ecount_list_purchases_internal` + `ecount_list_contracts` | ✅ |
| 판매 추이 | 월별 판매량/금액, 판매처별 비중 | `ecount_list_sales_internal` | ✅ |
| 마진 분석 | 판매단가 vs 원가+관세 | 매출+매입+환율 조합 계산 필요 | 🟡 |
| 재고 현황 | 3단계 재고, 회전율, 창고별 분포 | `ecount_verify_inventory` + Open API 재고 | 🟡 |
| 물류 KPI | 리드타임, 통관소요일, 서류완비율, ETA정확도 | `ecount_calc_logistics_kpi` | ✅ |
| 환율 모니터링 | USD/KRW 추이, 계약별 적용 환율 | `ecount_list_exchange_rates` + `ecount_get_exchange_rate` | ✅ |

> **참고**: BI 대시보드의 시각화(차트, 그래프)는 프론트엔드 영역이며, MCP는 데이터 조회 API를 제공합니다.

---

## 8. 수동 오버라이드

| # | 오버라이드 항목 | MCP 도구 | 상태 |
|---|--------------|---------|------|
| 1 | 환율 오버라이드 | `ecount_set_exchange_rate` (사유 기록 포함) | ✅ |
| 2 | ETA/선박정보 오버라이드 | `ecount_update_shipment_status` (상태만, ETA 전용 아님) | 🟡 |
| 3 | 관세/원가 오버라이드 | 없음 | ❌ |
| 4 | 재고 수량 조정 | 없음 | ❌ |
| 5 | 메일 초안 수정 | `ecount_render_email` (파라미터 변경 후 재렌더링) | ✅ |
| 6 | 계약/선적 수동 입력 | `ecount_add_contract`, `ecount_add_shipment` | ✅ |

---

## 9. 장애대응 & 백업

| 항목 | 관련 MCP 도구 | 상태 |
|-----|-------------|------|
| API 장애 시 대체 데이터소스 | `ecount_get_exchange_rate` (백업 API 로직 내장) | ✅ |
| CircuitBreaker (내부 API 보호) | `CircuitBreaker` 클래스 (Phase 1 구현) | ✅ |
| 세션 자동 갱신 (만료 시 재로그인) | `InternalApiSession` (30분 TTL, 자동 refresh) | ✅ |
| Excel 오프라인 백업 | `ecount_export_csv` (CSV 내보내기) | 🟡 |
| 데이터 정합성 점수 | `ecount_daily_report` (리포트 포함) | ✅ |

---

## 종합 집계

| 상태 | 건수 | 비율 |
|------|------|------|
| ✅ 구현 완료 | **29건** | 56% |
| 🟡 부분 구현 (확장 필요) | **14건** | 27% |
| ❌ 미구현 (신규 개발 필요) | **6건** | 12% |
| ⬜ MCP 범위 밖 | **3건** | 6% |

---

## 신규 개발 필요 목록 (우선순위)

| 순위 | 도구명 (제안) | 목적 | 난이도 |
|------|-------------|------|-------|
| 1 | `ecount_adjust_inventory` | 재고 수량 수동 조정 + 사유 기록 + 감사 추적 | 중 |
| 2 | `ecount_override_customs_cost` | 관세/원가 수동 입력, 부대비용 추가, 원가 재계산 | 중 |
| 3 | `ecount_update_eta` | ETA 전용 오버라이드 (자동↔수동 전환, 변경 이력) | 하 |
| 4 | `ecount_health_check` | 인프라+DB+API 통합 헬스체크 (L1 자가진단) | 하 |
| 5 | `ecount_validate_data_integrity` | 계약↔선적 정합성, 기초재고 검증, 관세 미반영 검출 (L2 확장) | 상 |
| 6 | `ecount_check_document_status` | 서류 체크리스트 완료 여부, 출고 미처리 감지 (L3 확장) | 중 |

---

## 부분 구현 확장 필요 목록

| 현재 도구 | 확장 내용 |
|----------|---------|
| `ecount_stale_shipments` | 통관 지연(7일+), 출고 미처리(3일+) 조건 추가 |
| `ecount_update_shipment_status` | ETA 필드 직접 업데이트 지원 |
| `ecount_verify_inventory` | 계약DB↔선적DB 교차 검증 로직 추가 |
| `ecount_status` | DB 연결, 외부 API(MS Graph, 선사, FAX) 상태 확인 확장 |
| `ecount_export_csv` | Excel(.xlsx) 형식 내보내기 + 암호화 옵션 |
| `ecount_daily_report` | L1~L3 자가진단 전 항목 통합 리포트 |

---

## MCP 범위 밖 (프론트엔드/인프라)

| 항목 | 설명 | 비고 |
|-----|------|------|
| 칸반 파이프라인 뷰 | 컨테이너 7단계 시각적 배치 | React/Vue UI |
| BI 대시보드 시각화 | 차트, 그래프, 파이차트 | 차트 라이브러리 |
| 디스크/메모리 모니터링 | 서버 리소스 감시 | 인프라 모니터링 도구 |
| OneDrive 폴더 동기화 | 폴더 구조 자동 검증/생성 | MS Graph API |
| 메일 수신 감지 | Outlook 메일 자동 감지 엔진 | MS Graph API |
| FAX 자동 발송 | 출고지시서 FAX 발송 | 외부 FAX API |
| 카카오톡 긴급 알림 | 장애 시 즉시 알림 | 카카오톡 API |
