# 아키텍처 드리프트 감지 결과

## 요약
- 순환 참조: 0개
- 레이어 위반 (tools -> tools): 6건
- 중복 코드: 2개 패턴
- 일관성 위반: 1건
- 미사용 코드: 1건 (board.ts 테스트 없음)
- any 사용: 0건
- TODO/FIXME: 0건
- 준수율: 83%

## 레이어 위반 (Core Invariant #5 위반: tools -> tools import)

| 파일 | import 대상 | 위반 유형 |
|------|-----------|----------|
| financial-statements.ts | receivables, payables, inventory-lifecycle | 데이터 공유 |
| stale-shipments.ts | shipment-tracking | 함수 공유 |
| logistics-kpi.ts | shipment-tracking | 함수/타입 공유 |
| daily-report.ts | shipment-tracking, contracts, exchange-rate, stale-shipments | 4개 모듈 의존 |
| health-check.ts | exchange-rate, shipment-tracking | 함수 공유 |

**권장**: 공유 데이터 스토어를 src/utils/ 또는 src/shared/로 분리

## 중복 코드

| 패턴 | 위치 | 통합 제안 |
|------|------|----------|
| Aging 계산 로직 | receivables.ts, payables.ts | 공통 aging 유틸 추출 |
| In-memory Map 스토어 | 5개 모듈 동일 패턴 | 제네릭 InMemoryStore<T> 고려 |

## 긍정적 소견
- any 사용 0건 (완벽한 타입 안전성)
- TODO/FIXME 0건
- 상향 import 0건
- 파일 크기 적정 (최대 269줄)
