---
name: ecount-enable-extras-env-flag-syntax
description: ECOUNT_ENABLE_EXTRAS 환경변수 문법; 콤마 리스트, "all", 또는 빈 값
type: reference
created: 2026-04-24
---

`ECOUNT_ENABLE_EXTRAS` 환경변수로 유틸 툴 그룹을 opt-in 게이팅한다. 값 종류:
- `""` (빈 값, 기본) — 5개 extras 모두 비활성화. 80 툴 기본 노출.
- `"all"` — 전체 extras 활성화 → 85 툴.
- `"map,diagram"` 같은 콤마 리스트 — 지정한 키만 활성화.

게이팅 대상 키: `pdf-stamp`, `diagram`, `map`, `presentation`, `three-d`. 로직은 `src/config.ts` `isExtraEnabled(config, key)` 헬퍼.

**Why:** Phase B에서 희귀 유틸을 기본 페이로드에서 분리해 -8.8% 감소. 운영 팀이 스테이징/프로덕션마다 다른 조합을 쓸 수 있도록 콤마 리스트 지원.

**How to apply:** 새 유틸 툴 추가 시 `src/tools/index.ts`에서 `if (isExtraEnabled(config, "<key>")) register...Tools(server)` 조건부 등록. 라우터 재설계 시 `ActionDef.requiresExtras` 필드로 per-action 게이팅 가능. E2E 테스트에서 extras 필요하면 `ECOUNT_ENABLE_EXTRAS: "all"`을 서버 config에 주입.
