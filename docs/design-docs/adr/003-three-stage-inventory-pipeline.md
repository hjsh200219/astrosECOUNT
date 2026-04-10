# ADR-003: 3단계 재고 파이프라인 (미착 → 미통관 → 상품)

- **상태**: Accepted
- **날짜**: 2026-04-05
- **결정자**: 프로젝트 설계자

## 맥락 (Context)

수입육 무역업에서 물품은 계약부터 판매까지 여러 상태를 거친다:
1. **미착**: 선적 완료 후 도착 전 (해상 운송 중)
2. **미통관**: 입항 후 통관 대기 중
3. **상품**: 통관 완료 후 판매 가능 상태

각 단계에서 재고 수량과 원가가 다르게 관리되며,
ECOUNT ERP의 창고 코드 체계(2x/3x/4x)와 1:1 매핑된다.

## 결정 (Decision)

재고 전환을 `InventoryTransition` 이벤트 기반으로 관리한다:
- 각 전환은 `fromStage → toStage` + 수량 + 타임스탬프
- 수불부(SubuiBu)는 transition 이벤트를 집계하여 동적 생성
- ECOUNT 창고 코드와의 매핑은 `business-rules.ts`에서 관리

## 대안 (Alternatives Considered)

| 대안 | 장점 | 단점 | 탈락 사유 |
|------|------|------|-----------|
| 단순 재고 수량 관리 | 구현 단순 | 단계별 추적 불가 | 수불부 생성 불가 |
| ECOUNT 재고 API 직접 사용 | 실시간 데이터 | Open API 재고 이동 미지원 | API 커버리지 한계 |

## 결과 (Consequences)

- **긍정**: 수불부를 자동으로 정확하게 생성할 수 있음
- **긍정**: 단계별 정합성 검증(data-integrity, inventory-verify) 가능
- **부정**: 이벤트 소싱 방식이라 상태 복원에 전체 이벤트 순회 필요
- **리스크**: 이벤트 누락 시 수불부 부정확 — 정합성 검증 도구로 보완

## 참고 (References)

- `src/utils/inventory-transition-store.ts` — 전환 이벤트 저장소
- `src/tools/financial-statements.ts` — 수불부 생성 로직
- `src/tools/inventory-verify.ts` — 재고 정합성 검증
- `docs/03-business-workflow.md` — 업무 플로우
