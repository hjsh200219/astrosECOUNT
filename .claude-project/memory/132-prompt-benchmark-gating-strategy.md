---
name: 132-prompt-benchmark-gating-strategy
description: 10-tool 라우터 cutover 전 argument-selection 정확도 Wilson CI 하한 ≥85% 게이트
created: 2026-04-24
type: project
---

80 → 10 툴 통합은 모델의 도메인·액션 선택 정확도 리스크가 큼. 게이트: `scripts/bench-action-selection.mjs`에 132개 한국어 프롬프트(액션당 2개 × ~66 액션) 실행, 95% Wilson CI 하한이 **≥85%**(약 118/132)여야 Phase 3 cutover 가능. 추가로 3회 manual operator validation 필수. 실패 시 Option B(30-tool 중간 통합)로 폴백. 프로덕션 mis-dispatch >5%/3영업일 시 `ECOUNT_LEGACY_TOOLS=1` 플립(2릴리스 호환 창구).

**Why:** Advisor가 Rev 1에서 "n=20은 통계적으로 85%와 92%를 구분 못한다"고 지적(Wilson CI ±13점). n=132로 올려야 의사결정 가능한 해상도 확보. 이 게이트가 없으면 silent 정확도 절벽에 빠진다.

**How to apply:** Phase 0에 executor가 132 한국어 natural-language 프롬프트 작성 (기계번역 금지, 실제 사용 시나리오 기반). 각 도메인 라우터 land 후 재측정. Phase 5에서 주간 재실행으로 regression 감시. 프롬프트 파일은 `scripts/bench-action-selection.mjs`에 위치, 레이블링 프로토콜은 plan §11 참조.
