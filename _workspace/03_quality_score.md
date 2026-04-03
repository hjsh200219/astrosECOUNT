# 도메인별 품질 등급

## 등급표

| 도메인 | 테스트 | 타입 | 에러처리 | 복잡도 | 종합 | 추세 |
|--------|:------:|:----:|:--------:|:------:|:----:|:----:|
| Config | A | A | A | A | **A** | → |
| Client / Session | A | A | A | B | **A** | → |
| Client / CircuitBreaker | A | A | A | B | **A** | → |
| Client / KeyPack | A | A | B | A | **A** | → |
| Client / InternalApi | A | B | A | B | **A-** | → |
| Tools / Factory | A | A | A | A | **A** | → |
| Tools / Category A (CRUD) | B | A | A | A | **A-** | → |
| Tools / Category B (Standalone) | A | A | B | B | **B+** | → |
| Tools / Category B+ (Utils) | A | B | B | B | **B+** | → |
| Tools / board | F | A | B | A | **C** | NEW |
| Utils / error-handler | A | A | A | A | **A** | → |
| Utils / response-formatter | A | A | A | A | **A** | → |
| Utils / logger | B | A | A | A | **A-** | → |
| Utils / persistence | B | B | C | A | **B** | → |

## 전체 평균: A-
## 이전 대비: → (유지)

## 새로 발견된 기술 부채

| 항목 | 도메인 | 심각도 | 설명 |
|------|--------|--------|------|
| board.ts 테스트 누락 | Tools | P2 | 유일하게 테스트 없는 tool 모듈 |
| tools -> tools import 6건 | Architecture | P2 | Core Invariant #5 위반 |
| 도메인 문서 경로 불일치 | Docs | P1 | 8건 경로 미갱신 |
| ARCHITECTURE.md 수치 오류 | Docs | P2 | tool/test 수 업데이트 필요 |
