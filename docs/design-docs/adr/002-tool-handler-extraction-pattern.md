# ADR-002: Tool Handler 추출 패턴

- **상태**: Accepted
- **날짜**: 2026-04-05
- **결정자**: 프로젝트 설계자

## 맥락 (Context)

MCP tool 등록 시 `server.tool(name, desc, schema, handler)` 패턴에서
핸들러를 인라인으로 작성하면 register 함수가 50줄을 쉽게 초과한다.
특히 여러 tool을 등록하는 모듈에서 register 함수가 비대해지는 문제.

## 결정 (Decision)

각 tool의 핸들러를 register 함수 상단에 독립 `async function`으로 추출한다:
```typescript
async function handleCreateProduct(params: ...) { ... }

export function registerProductTools(server: McpServer): void {
  server.tool("name", "desc", schema, handleCreateProduct);
}
```
- 핸들러 네이밍: `handle{ToolAction}` (예: `handleSendFax`, `handleListTemplates`)
- register 함수는 선언(schema + handler 바인딩)만 담당

## 대안 (Alternatives Considered)

| 대안 | 장점 | 단점 | 탈락 사유 |
|------|------|------|-----------|
| 인라인 핸들러 유지 | 선언과 구현이 한 곳 | register 함수 비대 | 50줄 규칙 위반 |
| 핸들러를 별도 파일로 분리 | 완전한 관심사 분리 | 파일 수 2배 증가 | 과도한 분리 |
| 데이터 주도 등록 | 반복 최소화 | 복잡한 핸들러에 부적합 | 일부 도구만 적용 가능 |

## 결과 (Consequences)

- **긍정**: register 함수가 30줄 이내로 유지됨
- **긍정**: 핸들러를 독립적으로 테스트하기 용이
- **부정**: 스크롤이 필요하지만, 함수명으로 검색 가능

## 참고 (References)

- `src/tools/*.ts` — 전체 tool 모듈에 적용
- `docs/DESIGN.md` — 코딩 패턴 가이드
