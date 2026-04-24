---
name: router-pattern-handler-extraction-prerequisite
description: tool-factory closure와 inline closure는 ActionDef 래핑 전에 명명 함수로 추출 필요
type: project
created: 2026-04-24
---

`src/tools/tool-factory.ts` 기반 모듈(sales, purchase, inventory, master-data, production, accounting, other)과 `connection.ts`의 핸들러는 `registerTools()` 또는 `server.tool()` 내부 closure로만 존재한다. 명명 export가 없다. 라우터 패턴의 `ActionDef.handler`는 명명 async 함수를 기대하므로, closure → 명명 함수 추출이 필수 선행 작업(Phase 0.5).

**Why:** Advisor가 Rev 2 리뷰에서 "핸들러를 verbatim 재사용한다"는 원래 주장이 2/3 모듈에서 false라고 지적. 추출 없이는 Phase 1 라우터 인프라가 성립 안 됨. 반면 `shipment-tracking.ts` 같은 이미 `handle*` 명명 함수가 있는 모듈은 바로 래핑 가능.

**How to apply:** Phase 0.5는 순수 mechanical refactor — (1) closure 본문 식별, (2) `export async function handleFoo(...)`로 이동, (3) `registerTools()`가 명명 함수를 참조하도록 변경. 비즈니스 로직 불변. 모든 기존 테스트는 수정 없이 통과해야 함. 독립 커밋.
