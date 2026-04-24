---
name: schema-payload-dominance-korean-signal
description: inputSchema가 MCP tools/list payload의 72%; 불투명 UPPER_SNAKE 코드의 한글 .describe()는 load-bearing
type: project
created: 2026-04-24
---

ECOUNT Open API는 `PROD_CD`, `CUST`, `SUPPLY_AMT_F` 같은 불투명한 UPPER_SNAKE 필드명을 사용한다. Zod 스키마의 한글 `.describe()` 번역은 load-bearing이다. Phase A 실측에서 payload 비중은 description 7% / inputSchema 72%였으며, 자명한 describe만 제거해도 -7.6%가 한계선이었다. 한글 주석을 공격적으로 지우면 모델이 품목 코드와 거래처 코드를, 수량과 금액을 혼동하기 시작한다.

**Why:** 10-tool 라우터 전환(`.omc/plans/tool-consolidation-10.md`)은 `passthrough()`로 inputSchema를 tools/list에서 숨기는 구조라, Claude Desktop 같은 non-Claude-Code 클라이언트는 한글 힌트를 보지 못한다. 정확도 저하가 바로 나타난다.

**How to apply:** 새 describe 쓸 때 규칙 — 필드명 반복(`name.describe("name")`)은 삭제, 포맷·단위·도메인 제약(`"YYYY-MM-DD"`, `"KRW"`, `"PROD_CD 품목코드"`)은 유지. Phase 3 cutover 시 라우터 description에 compact action-list + 핵심 한글 용어를 embed해 non-Claude-Code 클라이언트에도 최소 signal을 남길 것.
