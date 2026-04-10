# ADR-001: Open API / Internal API 이중 세션 분리

- **상태**: Accepted
- **날짜**: 2026-04-05
- **결정자**: 프로젝트 설계자

## 맥락 (Context)

ECOUNT ERP는 공식 Open API와 비공식 Internal Web API 두 가지 채널을 제공한다.
두 API는 인증 방식이 다르고(Open API: API Cert Key, Internal API: KeyPack 프로토콜),
한쪽의 세션 만료가 다른 쪽에 영향을 주면 안 된다.

## 결정 (Decision)

두 API의 세션 관리를 완전히 분리한다:
- `SessionManager`: Open API 세션 (login → session token)
- `InternalSessionManager`: Internal API 세션 (KeyPack 기반 인증)
- 각각 독립적인 자동 재시도 및 만료 처리
- Internal API에만 CircuitBreaker 적용 (비공식 API의 불안정성 대응)

## 대안 (Alternatives Considered)

| 대안 | 장점 | 단점 | 탈락 사유 |
|------|------|------|-----------|
| 단일 통합 세션 매니저 | 코드 단순 | 한쪽 실패가 전체 전파 | 장애 격리 불가 |
| Internal API 미사용 | 안정성 | Open API 커버리지 ~80% 한계 | 기능 부족 |

## 결과 (Consequences)

- **긍정**: 장애 격리 — Open API가 정상이면 Internal API 장애와 무관하게 동작
- **긍정**: CircuitBreaker로 Internal API 장애 시 빠른 실패 (30초 OPEN)
- **부정**: 세션 관련 코드가 두 벌 존재
- **리스크**: Internal API 프로토콜 변경 시 역공학 재작업 필요

## 참고 (References)

- `src/client/session-manager.ts` — Open API 세션
- `src/client/internal-session-manager.ts` — Internal API 세션
- `src/client/circuit-breaker.ts` — CircuitBreaker 구현
- `docs/07-internal-api-reverse-engineering.md` — KeyPack 프로토콜
