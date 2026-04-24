---
created: 2026-04-24T21:00:00+09:00
project: astrosECOUNT
summary: MCP tools/list payload -12.6% (Phase A+B+C 커밋 완료); 다음 10-tool 라우터 재설계는 Rev 3 플랜 승인된 상태
---

## Session Digest

MCP 서버 85개 툴의 토큰 소모 최적화 작업. 측정 스크립트로 baseline 확정(60,379 B / 15,095 tok) 후 세 단계 개선: Phase B(5개 희귀 유틸을 `ECOUNT_ENABLE_EXTRAS` env flag로 게이팅), Phase C(85개 전부 `ecount_<domain>_<verb>_<noun>`로 BREAKING rename), Phase A(자명한 `.describe()` ~132개 제거, 한글 domain 주석은 보존). 결과 80 tools / 52,781 B / 13,195 tok (-12.6%), 674 테스트 전부 통과, 단일 커밋 03a2f8a로 main에 반영. 이어진 대화에서 80 → 10 툴 도메인 라우터 재설계를 ralplan consensus로 설계; Architect+Critic 모두 APPROVE한 Rev 3 플랜이 `.omc/plans/tool-consolidation-10.md`에 있음. 사용자가 A/B/C 커밋 후 세션 종료 선택, 10-tool 재설계는 다음 세션으로 이연.

## Progress

- [x] 측정 스크립트 baseline 확정 (/tmp/measure-mcp-tools.mjs)
- [x] Phase B — `ECOUNT_ENABLE_EXTRAS` 게이팅 (85 → 80)
- [x] Phase C — 85개 툴 네임스페이스 rename (BREAKING)
- [x] Phase A — 스키마 다이어트 28 모듈 (describe 약 132개 제거)
- [x] 단일 원자 커밋 03a2f8a on main
- [x] Rev 3 플랜 ralplan consensus APPROVED (Architect + Critic)
- [ ] main local 1 ahead / remote 2 ahead — push 안 함
- [ ] Phase 0 선행작업 — /tmp/measure-mcp-tools.mjs → scripts/
- [ ] Phase 0 선행작업 — 132 한국어 벤치마크 프롬프트 작성
- [ ] Phase 0.5 — tool-factory closure + inline closure → 명명 함수 추출
- [ ] Phase 1 — 라우터 인프라 (types, make-router, registerAllTools 시그니처)
- [ ] Phase 2 — 10개 도메인 라우터 구현
- [ ] Phase 3 — ECOUNT_ROUTER_MODE=1 cutover + 벤치마크 게이트
- [ ] Phase 4 — 레거시 모듈 삭제 (2 릴리스 후)
- [ ] Phase 5 — 지속 모니터링

## Next Steps

1. **Git 상태 동기화**: `git pull --rebase origin main` 또는 merge 결정 후 push. remote 2 ahead 상태라 그대로 두면 충돌 가능.
2. **플랜 재확인**: `.omc/plans/tool-consolidation-10.md` (Rev 3, 4,128 words) + `.omc/plans/open-questions.md` 읽기.
3. **Phase 0 수행**: (a) 측정 스크립트를 `scripts/measure-mcp-tools.mjs`로 이동 + 레퍼런스 업데이트; (b) 132 한국어 벤치마크 프롬프트 저자 결정 및 작성(기계번역 금지, 도메인 지식 필요).
4. **Phase 0.5 수행**: tool-factory 기반 모듈(sales/purchase/inventory/master-data/production/accounting/other) + connection.ts의 closure를 명명 함수(`handleFoo`)로 추출. 행위 불변 mechanical refactor. 독립 커밋.
5. **Phase 1 진입**: `src/tools/routers/types.ts`, `make-router.ts`(requiresExtras + requiresInternal 필터, action_dispatch 로그), `registerAllTools(server, client, config, internalClient?)` 시그니처 확장.
6. **Phase 2~3**: 플랜 §12의 순서대로 10개 도메인 라우터 구현 후 `ECOUNT_ROUTER_MODE=1` cutover + 벤치마크 Wilson CI 하한 ≥85% 게이트.

## Blockers

- **main divergence**: local 1 ahead (03a2f8a), origin/main 2 ahead. 다음 세션 시작 시 pull --rebase 또는 merge 전략 결정 필수. 현 상태로는 push 불가.
- **132 프롬프트 저자**: 플랜은 executor 담당으로 명시했지만 도메인 지식 품질 확보 필요. 에이전트 단독 작성 시 ground truth 라벨 품질 낮음 — 사람 검토 단계 고려.

## Watch Out

- `.omc/`은 `.gitignore`에 포함됨 → 플랜 문서는 로컬 유지, 다른 PC에서 동기화 안 됨. 다른 PC로 넘기려면 별도 경로 고려.
- Phase 4(레거시 제거)는 2 릴리스 경과 후. 조기 삭제 금지 — 외부 MCP 클라이언트 호환성.
- BREAKING change는 이미 main에 반영. 이 커밋 pull 받는 모든 외부 클라이언트는 툴 이름 참조 업데이트 필요.
- `/tmp/measure-mcp-tools.mjs`는 재부팅 시 소실. 다음 세션 첫 작업으로 `scripts/`에 이동.
- `src/utils/chart-renderer.ts:81`에 `console.error` 직접 호출 존재 (logger 미사용). 본 세션 변경분 아니지만 invariant #8 관점에서 후속 정리 필요.

## Files Touched

- `03a2f8a` (commit) — 69 files / +1023 / -787; Phase A+B+C 단일 원자 커밋
- `src/config.ts` — `ECOUNT_ENABLE_EXTRAS` 필드 + `isExtraEnabled()` 헬퍼
- `src/tools/index.ts` — 조건부 모듈 등록 (5 extras 게이팅)
- `src/tools/*.ts` — 40 모듈에서 85 툴 이름 변경 + 자명한 describe 제거
- `tests/tools/*.ts` + `tests/integration/server.test.ts` + `tests/e2e/mcp-server.e2e.test.ts` — 이름 literal 업데이트, extras=all 주입
- `docs/exec-plans/active/tool-slimdown.md` (NEW) — 단계별 측정 로그 + rename table
- `docs/howto/02~09`, `README.md`, `docs/raw/tool_list.json` — 문서 내 툴 이름 references 업데이트
- `.omc/plans/tool-consolidation-10.md` (gitignored, 로컬만) — Rev 3 플랜
- `.omc/plans/open-questions.md` (gitignored) — 미해결 질문
- `/tmp/measure-mcp-tools.mjs` (임시, 다음 세션 이동 필요) — `tools/list` payload 실측 스크립트
