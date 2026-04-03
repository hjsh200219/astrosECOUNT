# 문서 신선도 검증 결과

## 요약
- 유효한 참조: 22개
- 오래된 참조: 8개
- 문서화 누락: 5개
- 신선도 점수: 73% (22/30)

## agent.md / CLAUDE.md / AGENTS.md 검증
- CLAUDE.md는 agent.md의 symlink: **정상**
- agent.md: 존재하며 내용 유효
- AGENTS.md: 존재하며 내용 유효
- ARCHITECTURE.md: 존재하며 내용 유효

## 오래된 참조 (수정 필요)

| 파일 | 참조 | 상태 |
|------|------|------|
| agent.md | `docs/01-data-catalog.md` | docs/howto/로 이동됨 |
| agent.md | `docs/02-entity-relationship.md` | docs/howto/로 이동됨 |
| agent.md | `docs/03-business-workflow.md` | docs/howto/로 이동됨 |
| agent.md | `docs/04-tool-reference.md` | docs/howto/로 이동됨 |
| agent.md | `docs/05-api-coverage-gap.md` | docs/howto/로 이동됨 |
| agent.md | `docs/07-internal-api-reverse-engineering.md` | docs/howto/로 이동됨 |
| AGENTS.md | `docs/00-setup-operations.md` | docs/howto/로 이동됨 |
| AGENTS.md | `docs/08-v3-mcp-coverage.md` | docs/howto/로 이동됨 |

**원인**: 도메인 문서가 docs/ -> docs/howto/로 이동되었으나 참조 경로 미갱신

## ARCHITECTURE.md 내용 검증
- "22 MCP tool modules" → 실제 34+ 모듈: **불일치**
- "8 files" in client/ → 실제 8개: **정상**
- "4 files" in utils/ → 실제 4개: **정상**
- "36 files" in tests/ → 실제 48+개: **불일치**

## 문서화 누락

| 항목 | 유형 | 권장 조치 |
|------|------|----------|
| src/tools/board.ts | 테스트 누락 | tests/tools/board.test.ts 생성 |
| docs/howto/ 이동 미반영 | 경로 변경 | agent.md, AGENTS.md 경로 수정 |
| ARCHITECTURE.md 도구 수 | 수치 변경 | 22 -> 34+ 업데이트 |
| ARCHITECTURE.md 테스트 수 | 수치 변경 | 36 -> 48+ 업데이트 |
| docs/howto/09-v5-mcp-coverage.html | AGENTS.md 미등록 | 문서 맵에 추가 |

## 누락된 하네스 파일

| 파일 | 용도 | 생성 필요 |
|------|------|----------|
| docs/CODING_RULES.md | 코딩 규칙 | 예 |
| docs/TESTING.md | 테스트 전략 | 예 |
