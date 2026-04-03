# 코드베이스 건강도 보고서 -- astrosECOUNT

## 종합 요약

| 지표 | 값 | 상태 |
|------|---|------|
| 문서 신선도 | 73% | 🟡 |
| 아키텍처 준수율 | 83% | 🟡 |
| 평균 품질 등급 | A- | 🟢 |
| 즉시 수정 가능 | 10건 | — |
| 수동 검토 권장 | 4건 | — |

## 가장 시급한 개선 영역

1. **문서 경로 불일치 (P1)**: docs/ -> docs/howto/ 이동 후 agent.md, AGENTS.md의 참조 8건 미갱신
2. **tools -> tools import 위반 (P2)**: Core Invariant #5 위반 6건 — 공유 데이터를 utils/로 분리 필요
3. **board.ts 테스트 누락 (P2)**: 유일하게 테스트 없는 tool 모듈

## 자동 수정 가능 (승인 후 실행)

| # | 파일 | 변경 내용 | 카테고리 |
|---|------|---------|----------|
| 1 | agent.md | `docs/01-data-catalog.md` → `docs/howto/01-data-catalog.md` | 경로 수정 |
| 2 | agent.md | `docs/02-entity-relationship.md` → `docs/howto/02-entity-relationship.md` | 경로 수정 |
| 3 | agent.md | `docs/03-business-workflow.md` → `docs/howto/03-business-workflow.md` | 경로 수정 |
| 4 | agent.md | `docs/04-tool-reference.md` → `docs/howto/04-tool-reference.md` | 경로 수정 |
| 5 | agent.md | `docs/05-api-coverage-gap.md` → `docs/howto/05-api-coverage-gap.md` | 경로 수정 |
| 6 | agent.md | `docs/07-internal-api-reverse-engineering.md` → `docs/howto/07-internal-api-reverse-engineering.md` | 경로 수정 |
| 7 | AGENTS.md | `docs/00-setup-operations.md` → `docs/howto/00-setup-operations.md` | 경로 수정 |
| 8 | AGENTS.md | `docs/08-v3-mcp-coverage.md` → `docs/howto/08-v3-mcp-coverage.md` | 경로 수정 |
| 9 | ARCHITECTURE.md | "22 tool modules" → "34 tool modules" | 수치 수정 |
| 10 | ARCHITECTURE.md | "36 files" → "48 files" | 수치 수정 |

## 수동 검토 권장

| # | 파일 | 이슈 | 권장 조치 |
|---|------|------|----------|
| 1 | src/tools/financial-statements.ts 외 | tools -> tools import 6건 | 공유 데이터를 src/shared/ 또는 src/utils/로 분리 |
| 2 | src/tools/board.ts | 테스트 파일 없음 | tests/tools/board.test.ts 생성 |
| 3 | receivables.ts / payables.ts | Aging 계산 로직 중복 | 공통 유틸 추출 |
| 4 | utils/persistence.ts | 쓰기 오류 시 silent failure | 에러 핸들링 보강 |

## 다음 실행 권장 시점
주요 tool 모듈 추가 후 또는 2주 후
