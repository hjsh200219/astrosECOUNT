# ECOUNT ERP MCP Server -- 문서 인덱스

> 최종 업데이트: 2026-03-27 | COM_CODE: 635188 | Zone: AA

---

## 하네스 문서 (Harness Engineering)

| 문서 | 내용 |
|------|------|
| [DESIGN.md](DESIGN.md) | 코딩 패턴, 네이밍 컨벤션, 에러 계층, 도구 설계 규칙 |
| [FRONTEND.md](FRONTEND.md) | N/A -- 백엔드 MCP 서버 (프론트엔드 없음) |
| [PRODUCT_SENSE.md](PRODUCT_SENSE.md) | 제품 비전, 사용자 페르소나, 도메인 컨텍스트 |
| [QUALITY_SCORE.md](QUALITY_SCORE.md) | 도메인별 품질 등급 (A~F), 테스트 커버리지, 개선 경로 |
| [SECURITY.md](SECURITY.md) | 인증 아키텍처, 시크릿 관리, 위협 모델 |
| [RELIABILITY.md](RELIABILITY.md) | 세션 신뢰성, 서킷 브레이커, 에러 핸들링 계약 |
| [PLANS.md](PLANS.md) | 실행 계획 인덱스 |

| 디렉토리 | 내용 |
|-----------|------|
| [design-docs/](design-docs/) | 아키텍처 결정 문서 (레이어 규칙, 핵심 원칙) |
| [exec-plans/](exec-plans/) | 실행 계획 (active / completed / tech-debt) |
| [product-specs/](product-specs/) | 제품 사양 및 기능 요구사항 |
| [references/](references/) | 외부 참조 문서 (LLM docs, 디자인 시스템 등) |
| [generated/](generated/) | 자동 생성 문서 (ERP 엔티티 맵) |

---

## 도메인 문서 (데이터 흐름 + 업무 플로우)

| 문서 | 내용 |
|------|------|
| [howto/03-business-workflow.md](howto/03-business-workflow.md) | **업무 플로우 (End-to-End)** -- 구매->물류->재고->판매->회계 전체 사이클 |
| [howto/01-data-catalog.md](howto/01-data-catalog.md) | **데이터 카탈로그** -- 품목 29건, 재고 1,358톤, 발주 30건, 판매 622건, 구매 261건, 회계 1,609건, 세금계산서 147건 |

---

## 시스템 & API

| 문서 | 내용 |
|------|------|
| [howto/00-setup-operations.md](howto/00-setup-operations.md) | 환경 설정, 인증 (Open API + 내부 API), 세션 관리 |
| [howto/02-entity-relationship.md](howto/02-entity-relationship.md) | ERD, 엔티티 관계, 코드 체계 (거래처/창고/프로젝트) |
| [howto/04-tool-reference.md](howto/04-tool-reference.md) | MCP 도구 23개 + 시스템 아키텍처 + 내부 API V5 9개 엔드포인트 |
| [howto/05-api-coverage-gap.md](howto/05-api-coverage-gap.md) | API 커버리지 갭 분석 + 내부 API로 해소된 갭 (**~80%** 커버리지) |

---

## 기술 참조

| 문서 | 내용 |
|------|------|
| [howto/07-internal-api-reverse-engineering.md](howto/07-internal-api-reverse-engineering.md) | 내부 Web API 역공학 -- `__$KeyPack` 프로토콜, 구현 전략 |
| [howto/08-v3-mcp-coverage.md](howto/08-v3-mcp-coverage.md) | V3 시스템 구성안 MCP 구현 커버리지 분석 |
| [references/ECOUNT_Open_API_Documentation.md](references/ECOUNT_Open_API_Documentation.md) | ECOUNT 공식 Open API 문서 |

---

## 원시 데이터

| 폴더 | 내용 |
|------|------|
| [raw/](raw/) | API 응답 원본 JSON (품목, 재고, 발주서, 도구 목록 등) |

---

## 데이터 신뢰도 범례

| 라벨 | 의미 | 적용 대상 |
|------|------|----------|
| `[V]` VERIFIED | 실데이터 확인 | 품목, 재고, 발주, **판매, 구매, 견적, 세금계산서, 회계전표, 부가세, 채권/채무** |
| `[I]` INFERRED | 스키마 추론 | 생산 |
| `[L]` V3_LEGACY | 웹 UI 확인 (API 캡처 불가) | 거래처 목록, 작업지시서, 생산입고 |
| `[U]` UNKNOWN | 미확인 | 원장 |

---

## 데이터 소스

| 소스 | 인증 방식 | 커버리지 |
|------|----------|---------|
| Open API V2/V3 | `SESSION_ID` (OAPILogin) | ~17% (품목, 재고, 발주) |
| 내부 Web API (V5 app) | `ec_req_sid` (웹 로그인) | +63% (판매, 구매, 견적, 세금계산서, 회계, 부가세) |
| 내부 Web API (V3 Legacy) | `ec_req_sid` (웹 로그인) | 확인만 (거래처, 생산 -- SSR 캡처 불가) |
| 종합 | - | **~80%** (미구현: V3 Legacy 거래처/생산, 원장) |
