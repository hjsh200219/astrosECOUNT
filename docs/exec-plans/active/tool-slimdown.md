# MCP Tools Payload Slimdown

**Started**: 2026-04-24
**Goal**: MCP `tools/list` payload 토큰 소모 감소 + 네임스페이싱 재정비

## Baseline (측정: 2026-04-24)

```
tools/list payload:  60,379 bytes
추정 토큰 (4B/tok):    15,095 tokens
등록 툴 개수:          85개
description 합계:     4,371 B (7%)
inputSchema 합계:    43,429 B (72%)
```

측정 스크립트: `/tmp/measure-mcp-tools.mjs`

## 실행 순서 (Advisor 권고)

### Phase B — 조건부 로딩 (env flag)
희귀 유틸 툴을 `ECOUNT_ENABLE_EXTRAS` 같은 플래그로 조건부 등록.
- 대상: `map`, `presentation`, `three-d`, `diagram`, `pdf-stamp`
- 변경 범위: `src/tools/index.ts` + `src/config.ts`
- 리스크: 최소 (순수 subtract)

### Phase C — 네임스페이싱 (Breaking)
`ecount_<verb>_<noun>` → `ecount_<domain>_<verb>_<noun>` 형태로 재편.
MCP 스펙상 이름은 `^[a-zA-Z0-9_-]+$` 만 허용 → 점 대신 언더스코어.
- 도메인: `sales`, `purchase`, `inventory`, `production`, `accounting`, `master`, `board`, `contact`, `shipment`, `logistics`, `receivable`, `payable`, `report`, `csv`, `pdf`, `fax`, `diagram`, `map`, `presentation`, `viz3d`, `bl`, `business_rule`, `email`, `contract`, `customs`, `adjust`, `integrity`, `document`, `weight`, `inventory_lifecycle`, `financial`, `margin`, `dashboard`, `connection`, `internal`, `health`, `stale`
- 변경 범위: `src/tools/*.ts` `ToolDefinition.name` + `tests/**`
- 리스크: Breaking — 외부 클라이언트 재설정 필요

### Phase A — 스키마 다이어트 (85개 전체)
규칙 기반 (자동화 + 케이스별 판단):
- `.describe()` 제거 조건: 필드명으로 자명할 때만 (`name: z.string().describe("name")` 등)
- 유지 조건: 단위/포맷/도메인 제약 (`"YYYY-MM-DD"`, `"KRW"`, `"comma-separated IDs"`)
- `z.enum([50개])` → 서버측 검증이 이미 있을 때만 `z.string()`으로 완화
- Optional 필드 제거: grep으로 미사용 확인된 것만

각 Phase 후:
1. `node /tmp/measure-mcp-tools.mjs`로 실측
2. `npm run build && npm test` 통과 확인
3. 이 파일에 delta 기록
4. 독립 커밋

## 측정 로그

| Phase | 날짜 | tools | bytes | tokens | delta |
|-------|------|-------|-------|--------|-------|
| Baseline | 2026-04-24 | 85 | 60,379 | 15,095 | — |
| After B  | 2026-04-24 | 80 | 55,066 | 13,767 | -5,313 B (-8.8%), -1,328 tok (-8.8%) |
| After C (default, 80)      | 2026-04-24 | 80 | 55,727 | 13,932 | +661 B (+1.2%) vs After B |
| After C (extras=all, 85)   | 2026-04-24 | 85 | 60,997 | 15,249 | +618 B (+1.0%) vs Baseline |
| After A (default, 80)      | 2026-04-24 | 80 | 52,781 | 13,195 | -2,946 B (-5.3%) vs After C default; -2,285 B (-3.8%) vs Baseline (different tool set) |
| After A (extras=all, 85)   | 2026-04-24 | 85 | 57,428 | 14,357 | -3,569 B (-5.8%) vs After C extras; **-2,951 B (-4.9%), -738 tok (-4.9%) vs Baseline** |

### Phase B 완료 메모 (2026-04-24)

**게이팅된 툴 그룹 (5개, 기본 비활성화)**:
- `pdf-stamp` → `ecount_pdf_stamp_pdf`
- `diagram` → `ecount_diagram_render_diagram`
- `map` → `ecount_map_render_map`
- `presentation` → `ecount_presentation_render_presentation`
- `three-d` → `ecount_viz3d_render_3d`

**재활성화 방법**: `.env`에 `ECOUNT_ENABLE_EXTRAS=all` 또는 `ECOUNT_ENABLE_EXTRAS=map,diagram` (콤마 구분) 설정.

**변경 파일**:
- `src/config.ts`: `ECOUNT_ENABLE_EXTRAS` 필드 추가 (zod schema), `isExtraEnabled()` 헬퍼 함수 추출
- `src/tools/index.ts`: 5개 모듈 등록을 `isExtraEnabled()` 조건부로 래핑, `config` 파라미터 optional화
- `tests/integration/server.test.ts`: 기본 툴 카운트 85 → 80으로 수정
- `tests/e2e/mcp-server.e2e.test.ts`: E2E 서버 설정에 `ECOUNT_ENABLE_EXTRAS: "all"` 추가 (extras 커버리지 유지)

**측정값 (ECOUNT_ENABLE_EXTRAS=all 시)**: 85툴, 60,301 bytes, 15,075 tokens (baseline과 거의 동일 — extras 복원됨 확인)

---

### Phase A 완료 메모 (2026-04-24)

**규칙 적용 결과**:
- Rule 1 (확장): 자기설명적 영문 필드명 위에 붙은 단순 번역 describe 제거
  - camelCase ID/이름 필드: `id`, `product`, `buyer`, `supplier`, `warehouse`, `amount`, `status`, `blNumber`, `shipmentId`, `contractId` 등 → describe 제거
  - UPPER_SNAKE 영어 표준 용어: `REMARKS → "비고"`, `PRICE → "단가"`, `VAT_AMT → "부가세액"`, `EXCHANGE_RATE → "환율"`, `EMAIL → "이메일"`, `TEL → "전화번호"`, `FAX → "Fax"`, `ADDR → "주소"` → 제거
  - 페이지 번호 등 영문 셀프설명: `page`, `per_page`, `PAGE_CURRENT`, `PAGE_SIZE` → 제거
- 유지 (load-bearing):
  - 불투명 ECOUNT 코드 + 한국어: `PROD_CD/품목코드`, `CUST/거래처코드`, `EMP_CD/담당자코드`, `WH_CD/창고코드`, `SIZE_DES/규격`, `PROD_DES/품목명`, `SUPPLY_AMT/공급가액`, `IO_TYPE/구분(거래유형)...`, `PJT_CD/프로젝트코드` 등 → 전부 KEEP
  - 포맷/단위/enum 힌트: `YYYY-MM-DD`, `YYYYMMDD`, `KRW`, `USD`, `kg`, `(Y/N)`, `(B:기본설정, M:필수입력...)`, `(예: ...)` → 전부 KEEP
- Rule 2 (enum collapse): 해당 없음 — 모든 z.enum이 ≤8 values
- Rule 3 (unused field removal): 미적용 — handler/docs 양방향 검증 위험
- Rule 4 (shared schema extraction): 미적용 — MCP tools/list는 각 툴 스키마를 독립적으로 인라인 직렬화 (zod-to-json-schema의 `$ref` 공유 없음) → 페이로드 감소 효과 0

**수정된 파일 수**: 28개 (38 tool 모듈 중)
- 큰 영향: sales.ts, purchase.ts, production.ts, master-data.ts, contracts.ts, shipment-tracking.ts, data-integrity.ts, inventory-verify.ts, inventory-lifecycle.ts
- 중간: payables, receivables, margin-analysis, adjust-inventory, weight-settlement, customs-cost, fax, financial-statements, pdf-export, pdf-stamp
- 작음 (extras 포함): map, dashboard, presentation, three-d, diagram, email-templates, business-rules, csv-export, document-status, stale-shipments, internal-api, accounting, other

**제거된 describe 수**: 약 131개 (504 → 373)
**Enum 축소**: 0건
**필드 제거**: 0건

**측정값 변화**:
- 기본 (80 tools): 55,727 → **52,781 bytes** (-2,946 B, -5.3%), 13,932 → **13,195 tokens** (-737)
- extras=all (85 tools): 60,997 → **57,428 bytes** (-3,569 B, -5.8%), 15,249 → **14,357 tokens** (-892)
- inputSchema 부분만: 39,165 → 36,219 B (-7.5%, default) / 43,351 → 39,782 B (-8.2%, extras=all)

**Baseline 대비 누적 (B+C+A, extras=all 기준)**:
- Baseline 60,379 B / 15,095 tok → After A 57,428 B / 14,357 tok
- **차이: -2,951 B (-4.9%), -738 tok (-4.9%)**

**20-35% 목표 미달 사유 (정직한 평가)**:
ECOUNT Open API 툴들(sales, purchase, master-data, production, other, accounting)의 input 필드 대부분이 불투명한 UPPER_SNAKE 코드(`PROD_CD`, `CUST`, `SUPPLY_AMT_F`, `IO_TYPE` 등)이며, 한국어 describe가 코드의 의미를 해석해주는 load-bearing 정보임. 이러한 Korean translation을 제거하면 모델의 인자 선택 정확도가 떨어질 위험이 큼 — "when in doubt, KEEP" 원칙을 따라 보존함. 스키마 부피의 70%+는 이러한 opaque code 영역이므로 물리적 상한이 존재함. 추가 감소를 원할 경우 Rule 3(미사용 필드 제거)을 API 핸들러 및 ECOUNT 공식 문서와 cross-check 하여 적용하거나, 개별 ECOUNT API 툴을 optional flag 뒤로 숨기는 Phase B 확장이 현실적 방향임.

**테스트 결과**: 674 passed / 0 failed (테스트 수정 없음)

---

### Phase C 완료 메모 (2026-04-24)

> **BREAKING CHANGE**: 모든 MCP 툴 이름이 변경되었습니다. 외부 MCP 클라이언트(Claude Desktop 설정, 자동화 스크립트, API 호출 코드 등)에서 툴 이름을 참조하는 모든 곳을 아래 매핑 테이블에 따라 업데이트해야 합니다.

**변경 규칙**: `ecount_<verb>_<noun>` → `ecount_<domain>_<verb>_<noun>`
- MCP 스펙 정규식 `^[a-zA-Z0-9_-]+$` 준수 (언더스코어 사용, 점 없음)
- 85개 툴 전체 renamed, 충돌 없음

**변경 파일 수**:
- `src/tools/`: 40개 파일 (전체 모듈)
- `tests/`: 17개 파일 (unit + integration + e2e)
- `docs/`: 10개 파일 (markdown, html, json 포함)
- 기타: `README.md` (2건)

**측정값 (After C)**:
- 기본 (80툴): 55,727 bytes / 13,932 tokens (+661 B vs After B — 이름 길어진 만큼 증가)
- extras=all (85툴): 60,997 bytes / 15,249 tokens (+618 B vs Baseline)

#### Phase C 전체 리네임 테이블 (85개)

| File | Old name | New name |
|------|----------|----------|
| `accounting.ts` | `ecount_save_invoice_auto` | `ecount_accounting_save_invoice_auto` |
| `adjust-inventory.ts` | `ecount_adjust_inventory` | `ecount_inventory_adjust_inventory` |
| `adjust-inventory.ts` | `ecount_list_adjustments` | `ecount_inventory_list_adjustments` |
| `bl-parser.ts` | `ecount_parse_bl` | `ecount_bl_parse_bl` |
| `board.ts` | `ecount_create_board` | `ecount_board_create_board` |
| `business-rules.ts` | `ecount_get_customs_broker` | `ecount_rule_get_customs_broker` |
| `business-rules.ts` | `ecount_get_warehouse_mapping` | `ecount_rule_get_warehouse_mapping` |
| `business-rules.ts` | `ecount_list_business_rules` | `ecount_rule_list_business_rules` |
| `connection.ts` | `ecount_login` | `ecount_connection_login` |
| `connection.ts` | `ecount_status` | `ecount_connection_status` |
| `connection.ts` | `ecount_zone` | `ecount_connection_zone` |
| `contacts.ts` | `ecount_list_contacts` | `ecount_contact_list_contacts` |
| `contacts.ts` | `ecount_lookup_contact` | `ecount_contact_lookup_contact` |
| `contracts.ts` | `ecount_add_contract` | `ecount_contract_add_contract` |
| `contracts.ts` | `ecount_get_contract` | `ecount_contract_get_contract` |
| `contracts.ts` | `ecount_list_contracts` | `ecount_contract_list_contracts` |
| `contracts.ts` | `ecount_update_contract_status` | `ecount_contract_update_contract_status` |
| `csv-export.ts` | `ecount_export_csv` | `ecount_csv_export_csv` |
| `customs-cost.ts` | `ecount_get_landed_cost` | `ecount_customs_get_landed_cost` |
| `customs-cost.ts` | `ecount_override_customs_cost` | `ecount_customs_override_customs_cost` |
| `daily-report.ts` | `ecount_daily_report` | `ecount_report_daily_report` |
| `daily-report.ts` | `ecount_diagnostic_report` | `ecount_report_diagnostic_report` |
| `dashboard.ts` | `ecount_render_dashboard` | `ecount_dashboard_render_dashboard` |
| `data-integrity.ts` | `ecount_validate_data_integrity` | `ecount_integrity_validate_data_integrity` |
| `diagram.ts` | `ecount_render_diagram` | `ecount_diagram_render_diagram` |
| `document-status.ts` | `ecount_check_document_status` | `ecount_document_check_document_status` |
| `email-templates.ts` | `ecount_get_email_template` | `ecount_email_get_email_template` |
| `email-templates.ts` | `ecount_list_email_templates` | `ecount_email_list_email_templates` |
| `email-templates.ts` | `ecount_render_email` | `ecount_email_render_email` |
| `fax.ts` | `ecount_get_fax_status` | `ecount_fax_get_fax_status` |
| `fax.ts` | `ecount_list_fax_history` | `ecount_fax_list_fax_history` |
| `fax.ts` | `ecount_send_fax` | `ecount_fax_send_fax` |
| `financial-statements.ts` | `ecount_analyze_cashflow` | `ecount_financial_analyze_cashflow` |
| `financial-statements.ts` | `ecount_generate_pnl` | `ecount_financial_generate_pnl` |
| `financial-statements.ts` | `ecount_generate_subuibu` | `ecount_financial_generate_subuibu` |
| `health-check.ts` | `ecount_health_check` | `ecount_health_health_check` |
| `internal-api.ts` | `ecount_list_account_slips` | `ecount_internal_list_account_slips` |
| `internal-api.ts` | `ecount_list_purchases_internal` | `ecount_internal_list_purchases_internal` |
| `internal-api.ts` | `ecount_list_sales_internal` | `ecount_internal_list_sales_internal` |
| `internal-api.ts` | `ecount_list_vatslips` | `ecount_internal_list_vatslips` |
| `inventory-lifecycle.ts` | `ecount_get_inventory_pipeline` | `ecount_inventory_get_inventory_pipeline` |
| `inventory-lifecycle.ts` | `ecount_track_inventory_stage` | `ecount_inventory_track_inventory_stage` |
| `inventory-verify.ts` | `ecount_validate_contract_shipment` | `ecount_inventory_validate_contract_shipment` |
| `inventory-verify.ts` | `ecount_verify_inventory` | `ecount_inventory_verify_inventory` |
| `inventory.ts` | `ecount_list_inventory_balance` | `ecount_inventory_list_inventory_balance` |
| `inventory.ts` | `ecount_list_inventory_by_location` | `ecount_inventory_list_inventory_by_location` |
| `inventory.ts` | `ecount_view_inventory_balance` | `ecount_inventory_view_inventory_balance` |
| `inventory.ts` | `ecount_view_inventory_by_location` | `ecount_inventory_view_inventory_by_location` |
| `logistics-kpi.ts` | `ecount_calc_logistics_kpi` | `ecount_logistics_calc_logistics_kpi` |
| `map.ts` | `ecount_render_map` | `ecount_map_render_map` |
| `margin-analysis.ts` | `ecount_analyze_margin` | `ecount_margin_analyze_margin` |
| `master-data.ts` | `ecount_list_products` | `ecount_master_list_products` |
| `master-data.ts` | `ecount_save_customer` | `ecount_master_save_customer` |
| `master-data.ts` | `ecount_save_product` | `ecount_master_save_product` |
| `master-data.ts` | `ecount_view_product` | `ecount_master_view_product` |
| `other.ts` | `ecount_save_clock_in_out` | `ecount_other_save_clock_in_out` |
| `other.ts` | `ecount_save_open_market_order` | `ecount_other_save_open_market_order` |
| `payables.ts` | `ecount_aging_payables` | `ecount_payable_aging_payables` |
| `payables.ts` | `ecount_list_payables` | `ecount_payable_list_payables` |
| `payables.ts` | `ecount_record_payment_out` | `ecount_payable_record_payment_out` |
| `pdf-export.ts` | `ecount_export_pdf` | `ecount_pdf_export_pdf` |
| `pdf-stamp.ts` | `ecount_stamp_pdf` | `ecount_pdf_stamp_pdf` |
| `presentation.ts` | `ecount_render_presentation` | `ecount_presentation_render_presentation` |
| `production.ts` | `ecount_save_goods_issued` | `ecount_production_save_goods_issued` |
| `production.ts` | `ecount_save_goods_receipt` | `ecount_production_save_goods_receipt` |
| `production.ts` | `ecount_save_job_order` | `ecount_production_save_job_order` |
| `purchase.ts` | `ecount_list_purchase_orders` | `ecount_purchase_list_purchase_orders` |
| `purchase.ts` | `ecount_save_purchase` | `ecount_purchase_save_purchase` |
| `receivables.ts` | `ecount_aging_receivables` | `ecount_receivable_aging_receivables` |
| `receivables.ts` | `ecount_list_receivables` | `ecount_receivable_list_receivables` |
| `receivables.ts` | `ecount_record_payment` | `ecount_receivable_record_payment` |
| `sales.ts` | `ecount_save_quotation` | `ecount_sales_save_quotation` |
| `sales.ts` | `ecount_save_sale` | `ecount_sales_save_sale` |
| `sales.ts` | `ecount_save_sale_order` | `ecount_sales_save_sale_order` |
| `shipment-tracking.ts` | `ecount_add_shipment` | `ecount_shipment_add_shipment` |
| `shipment-tracking.ts` | `ecount_get_eta_history` | `ecount_shipment_get_eta_history` |
| `shipment-tracking.ts` | `ecount_get_shipment` | `ecount_shipment_get_shipment` |
| `shipment-tracking.ts` | `ecount_list_shipments` | `ecount_shipment_list_shipments` |
| `shipment-tracking.ts` | `ecount_update_eta` | `ecount_shipment_update_eta` |
| `shipment-tracking.ts` | `ecount_update_shipment_status` | `ecount_shipment_update_shipment_status` |
| `stale-shipments.ts` | `ecount_customs_delays` | `ecount_shipment_customs_delays` |
| `stale-shipments.ts` | `ecount_delivery_delays` | `ecount_shipment_delivery_delays` |
| `stale-shipments.ts` | `ecount_stale_shipments` | `ecount_shipment_stale_shipments` |
| `three-d.ts` | `ecount_render_3d` | `ecount_viz3d_render_3d` |
| `weight-settlement.ts` | `ecount_calc_weight_settlement` | `ecount_weight_calc_weight_settlement` |
