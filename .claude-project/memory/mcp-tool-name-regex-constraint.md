---
name: mcp-tool-name-regex-constraint
description: MCP 툴 이름은 ^[a-zA-Z0-9_-]+$ 정규식만 허용; 점(.) 금지
type: reference
created: 2026-04-24
---

MCP SDK의 툴 이름 검증은 `^[a-zA-Z0-9_-]+$`만 통과시킨다. 점(`.`)은 금지. 네임스페이싱할 때 `ecount.sales.save`는 등록 실패하고, `ecount_sales_save`는 성공한다.

**Why:** Phase C에서 네임스페이스 설계할 때 advisor가 "점 쓰면 에러"라고 지적해 언더스코어로 확정. 향후 라우터 10개 이름 설계(`ecount_sales`, `ecount_inventory` 등)도 같은 규칙.

**How to apply:** 새 툴/라우터/액션 이름 지을 때 언더스코어와 하이픈만 사용. `snake_case`가 기본 컨벤션. 점·공백·특수문자 전부 금지. 이름 규칙 위반 시 서버 기동 중 silent fail 또는 cryptic error 발생.
