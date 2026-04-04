# Fix Catalog — 원칙별 개선 액션 카탈로그

> 12원칙 × 점수 구간별 구체적 개선 액션 매핑.
> gc-synthesizer가 자동 수정 제안 시 이 카탈로그를 참조한다.

## 자동화 수준

| 수준 | 설명 |
|------|------|
| **Auto** | 에이전트가 독립적으로 생성/수정 가능 |
| **Semi** | 에이전트가 초안 생성, 사용자 검토 필요 |
| **Manual** | 사용자가 직접 판단/작업 |

---

## P1 — Agent Entry Point

| 점수 구간 | 개선 액션 | 자동화 | 산출물 |
|----------|-----------|--------|--------|
| 0-3 | AGENTS.md 초안 생성 (프로젝트 스캔 기반) | Auto | `AGENTS.md` |
| 0-3 | README.md 기본 구조 보완 | Auto | `README.md` |
| 4-6 | 빌드/테스트/실행 명령어 보완 | Semi | AGENTS.md 섹션 |
| 4-6 | 기술 스택/디렉토리 구조 섹션 추가 | Auto | AGENTS.md 섹션 |
| 7-9 | 서브디렉토리 AGENTS.md 추가 | Semi | `src/AGENTS.md` 등 |
| 7-9 | 에이전트별 맞춤 안내 최적화 | Manual | AGENTS.md 개선 |

## P2 — Map, Not Manual

| 점수 구간 | 개선 액션 | 자동화 | 산출물 |
|----------|-----------|--------|--------|
| 0-3 | 루트 디렉토리 설명 추가 | Auto | README.md |
| 4-6 | 파일/모듈 포인터 테이블 생성 | Auto | 포인터 섹션 |
| 4-6 | 문서 간 크로스 레퍼런스 삽입 | Auto | 링크 추가 |
| 7-9 | 깊은 레벨 탐색 가이드 추가 | Semi | 서브디렉토리 설명 |

## P3 — Invariant Enforcement

| 점수 구간 | 개선 액션 | 자동화 | 산출물 |
|----------|-----------|--------|--------|
| 0-3 | `.editorconfig` 생성 | Auto | `.editorconfig` |
| 0-3 | 기본 linter 설정 추가 | Semi | lint 설정 파일 |
| 4-6 | pre-commit hook 설정 | Auto | `.husky/` 등 |
| 4-6 | CI에 lint/format 강제 추가 | Semi | CI workflow |
| 7-9 | 엄격한 type-checking 활성화 | Semi | tsconfig/설정 |
| 7-9 | 아키텍처 규칙 도구 도입 | Manual | dependency-cruiser 등 |

## P4 — Convention Over Configuration

| 점수 구간 | 개선 액션 | 자동화 | 산출물 |
|----------|-----------|--------|--------|
| 0-3 | 코딩 컨벤션 문서 초안 생성 | Semi | `docs/conventions.md` |
| 4-6 | 네이밍/파일 구조 패턴 문서화 | Semi | AGENTS.md 섹션 |
| 7-9 | 규칙 위반 자동 탐지 설정 | Manual | lint 규칙 추가 |

## P5 — Progressive Disclosure

| 점수 구간 | 개선 액션 | 자동화 | 산출물 |
|----------|-----------|--------|--------|
| 0-3 | 루트 문서에 개요 섹션 추가 | Auto | README.md |
| 4-6 | 상세 문서를 `docs/`로 분리 | Semi | 디렉토리 구조 |
| 7-9 | ADR 템플릿 + 초기 ADR 작성 | Semi | `docs/adr/` |

## P6 — Layered Architecture

| 점수 구간 | 개선 액션 | 자동화 | 산출물 |
|----------|-----------|--------|--------|
| 0-3 | 모듈/패키지 경계 문서화 | Semi | 아키텍처 문서 |
| 4-6 | 의존성 방향 규칙 명시 | Semi | AGENTS.md / layer-rules |
| 4-6 | 순환 의존성 탐지 실행 | Auto | 리포트 |
| 7-9 | 순환 의존성 해소 | Manual | 코드 리팩터링 |

## P7 — Garbage Collection

| 점수 구간 | 개선 액션 | 자동화 | 산출물 |
|----------|-----------|--------|--------|
| 0-3 | dead code/미사용 파일 목록 생성 | Auto | 정리 목록 |
| 4-6 | stale 문서/코드 정리 체크리스트 | Semi | GC 작업 목록 |
| 4-6 | verify-docs 스크립트 생성 | Auto | `scripts/verify-docs.*` |
| 7-9 | 자동 GC CI 작업 도입 | Semi | CI workflow |

## P8 — Observability

| 점수 구간 | 개선 액션 | 자동화 | 산출물 |
|----------|-----------|--------|--------|
| 0-3 | 테스트 실행 명령어 문서화 | Auto | AGENTS.md 섹션 |
| 4-6 | 모듈 단위 테스트 실행 설정 | Semi | 테스트 설정 |
| 7-9 | 자동 변경 추적/검증 메커니즘 | Semi | 스크립트/도구 |

## P9 — Knowledge in Repo

| 점수 구간 | 개선 액션 | 자동화 | 산출물 |
|----------|-----------|--------|--------|
| 0-3 | 도메인 용어집 초안 | Semi | `docs/glossary.md` |
| 4-6 | ADR 템플릿 + 초기 기록 | Auto | `docs/adr/` |
| 4-6 | 외부 서비스 연동 문서화 | Semi | `docs/integrations.md` |
| 7-9 | 도메인 모델 문서 강화 | Manual | 도메인 문서 |

## P10 — Reproducibility

| 점수 구간 | 개선 액션 | 자동화 | 산출물 |
|----------|-----------|--------|--------|
| 0-3 | 런타임 버전 pin (.nvmrc 등) | Auto | 버전 파일 |
| 0-3 | 기본 환경 설정 스크립트 | Semi | `scripts/setup.sh` |
| 4-6 | Docker/devcontainer 설정 | Semi | `Dockerfile` 등 |
| 7-9 | 원커맨드 환경 프로비저닝 | Semi | 통합 스크립트 |

## P11 — Modularity

| 점수 구간 | 개선 액션 | 자동화 | 산출물 |
|----------|-----------|--------|--------|
| 0-3 | 모듈 경계 식별 + 문서화 | Semi | 아키텍처 문서 |
| 4-6 | 모듈별 독립 테스트 설정 | Semi | 테스트 구조 |
| 7-9 | 모듈 간 인터페이스 명세 | Manual | 인터페이스 문서 |

## P12 — Self-Documentation

| 점수 구간 | 개선 액션 | 자동화 | 산출물 |
|----------|-----------|--------|--------|
| 0-3 | 주요 파일 모듈 설명 주석 추가 | Semi | 코드 주석 |
| 4-6 | 복잡 로직 인라인 설명 추가 | Semi | 코드 주석 |
| 4-6 | 매직 넘버 → named constant 추출 | Auto | 코드 수정 |
| 7-9 | 자기 설명적 네이밍 개선 | Manual | 코드 리팩터링 |

---

## 사용법

1. Audit 결과에서 각 원칙의 점수 확인
2. 해당 점수 구간의 개선 액션 조회
3. `Auto` 항목 우선 적용 → `Semi` 초안 생성 → `Manual` 로드맵에 포함
4. 적용 후 Re-Audit으로 점수 변화 확인

## Remediate 모드에서의 활용

`--remediate` 플래그 사용 시:
1. gc-synthesizer가 약점 원칙 상위 3개 식별
2. fix-catalog에서 Auto 항목 자동 적용
3. Semi 항목은 초안 생성 후 사용자 승인 대기
4. Re-Audit으로 점수 delta 확인
5. 목표 미달 시 반복 (최대 3회)
