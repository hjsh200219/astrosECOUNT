# GC History

Harness GC 실행 이력입니다. `/sh:harness-gc`가 Phase 3에서 자동으로 업데이트합니다.

## 2026-04-05 (Run #2)
- 모드: full
- 문서 신선도: 92% → 수정 후 100%
- 아키텍처 준수율: ~88% → 수정 후 ~97%
- 품질 등급: A-
- 하네스 성숙도: L5 (81.7 pts)
- 약점 원칙: P3 (Invariant Enforcement: 7), P10 (Reproducibility: 7)
- 발견 이슈: 14건 (자동 수정: 8, 수동 검토: 6) → 전체 수정
- 반복 드리프트: 2건 (`persistence` 유령 참조, 파일 수 불일치) → 예방 스크립트에 체크 추가
- 주요 변경:
  - `outstanding-compute.ts` 공통 유틸 추출 (payables/receivables DRY)
  - `ecount-client.ts` fetchJson/extractApiError 추출 (post 62줄 → 22줄)
  - `shipment-tracking.ts` 핸들러 분리 (160줄 → registerFn 30줄)
  - `internal-api.ts` 데이터 주도 패턴 (129줄 → 리팩터링)
  - `contracts.ts` 핸들러 분리 (110줄 → registerFn 20줄)
  - `connection.ts` fetchZoneInfo 추출 (70줄 → 50줄)
  - `MS_PER_DAY` 상수화 (7개 파일 매직넘버 제거)
  - `.nvmrc` 추가, `verify-docs.ts` 강화 (파일 수 + stale ref 체크)

## 2026-04-05 (Run #1)
- 모드: full
- 문서 신선도: 72% → 수정 후 98%
- 아키텍처 준수율: 85% → 수정 후 100%
- 품질 등급: A-
- 발견 이슈: 25건 (즉시 수정: 18, 수동 검토: 7)
- 반복 드리프트: 없음 (최초 실행)
- 예방 스크립트 생성: Y (`scripts/verify-docs.ts`)
