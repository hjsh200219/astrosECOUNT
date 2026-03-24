# ECOUNT ERP MCP Server — 환경 설정 및 운영 가이드

## 계정 정보

| 항목 | 값 | 설명 |
|------|-----|------|
| COM_CODE | 635188 | 회사코드 (6자리) |
| USER_ID | CHSHIN | API 사용자 ID |
| ZONE | AA | 서버 Zone (한국) |
| LAN_TYPE | ko-KR | 언어 설정 |
| API_CERT_KEY | `.env` 파일 참조 | API 인증 키 (비공개) |

## 환경 변수 설정

`.env` 파일에 다음 변수를 설정합니다:

```env
ECOUNT_COM_CODE=635188
ECOUNT_USER_ID=CHSHIN
ECOUNT_API_CERT_KEY=<API 인증 키>
ECOUNT_ZONE=AA
ECOUNT_LAN_TYPE=ko-KR
```

## 서버 URL 구조

| 용도 | URL 패턴 | 예시 |
|------|----------|------|
| Zone 조회 | `https://sboapi.ecount.com/OAPI/V2/Zone` | Zone 전용 (접미사 없음) |
| V2 API | `https://sboapi{ZONE}.ecount.com/OAPI/V2/{Endpoint}` | `sboapiAA.ecount.com/OAPI/V2/Product/ListProduct` |
| V3 API | `https://sboapi{ZONE}.ecount.com/ec5/api/app.oapi.v3/action/{Action}` | 게시판 등록 전용 |

## 세션 관리

### 자동 로그인
- 최초 API 호출 시 자동으로 `OAPILogin` 엔드포인트를 호출하여 세션을 획득합니다.
- `SESSION_ID`는 URL 쿼리 파라미터로 전달됩니다: `?SESSION_ID={값}`

### 세션 만료 자동 재시도
1. API 응답에서 세션 만료 에러 감지 (`SESSION_EXPIRED`, `INVALID_SESSION`, `-1`)
2. 기존 세션 무효화
3. 자동 재로그인
4. 원래 요청 재시도 (1회)

### Promise 중복 방지
동시에 여러 API 호출이 발생해도 로그인 요청은 1회만 실행됩니다. (Promise deduplication)

## API 제한 사항

| 제한 | 값 |
|------|-----|
| 시간당 연속 오류 | 30건 |
| 1회 요청 최대 | 300건 |
| 1일 허용량 | 5,000건 |
| 요청 타임아웃 | 30초 |
| 발주서 조회 기간 | 최대 31일 |
| 내부 API Rate Limit | 불명확 (세션 기반) |

## V2 vs V3 API 차이

### V2 API (대부분의 도구)
- **URL**: `/OAPI/V2/{Category}/{Method}`
- **인증**: `?SESSION_ID={값}` (URL 쿼리)
- **Save 요청 본문**: `{ ListKey: [{ BulkDatas: {...} }] }`
- **Query 요청 본문**: 플랫 객체 직접 전달
- **응답 구조**: `{ Status, Error, Errors, Data }`

### V3 API (게시판 전용)
- **URL**: `/ec5/api/app.oapi.v3/action/{ActionName}`
- **인증**: `?session_Id={값}` (소문자 주의)
- **요청 본문**: `{ data: [{ master: {...} }] }`
- **응답 구조**: V2와 다를 수 있음 (raw JSON 반환)

## 에러 처리

### 에러 응답 형식
ECOUNT API는 두 가지 에러 형식을 사용합니다:

```json
// 형식 1: Error 객체
{ "Status": "500", "Error": { "Code": "...", "ErrorCode": "...", "Message": "..." } }

// 형식 2: Errors 배열
{ "Status": "500", "Errors": [{ "Code": "...", "Message": "..." }] }
```

### 주요 에러 코드
| 코드 | 의미 | 대응 |
|------|------|------|
| SESSION_EXPIRED | 세션 만료 | 자동 재로그인 |
| INVALID_SESSION | 유효하지 않은 세션 | 자동 재로그인 |
| -1 | 세션 에러 | 자동 재로그인 |
| Search Range Is Less Than 31 | 조회 기간 초과 | 31일 이내로 조정 |

## 내부 Web API 인증 (역공학)

Open API와 별개로, ECOUNT 웹 UI의 내부 API에 접근할 수 있습니다.

| 구분 | Open API | 내부 Web API |
|------|----------|-------------|
| 인증 방식 | `SESSION_ID` (OAPILogin) | `ec_req_sid` (웹 로그인) |
| 호스트 | `oapi{ZONE}.ecount.com` | `login{ZONE}.ecount.com` |
| 로그인 URL | `/OAPI/V2/OAPILogin` | `/Login/Login2` |
| 인코딩 | 표준 JSON | `__$KeyPack` 압축 + Base64 |
| 커버리지 | ~17% (품목, 재고, 발주) | ~100% (모든 웹 메뉴) |

```
# 웹 로그인
POST https://login.ecount.com/Login/Login2
Content-Type: application/x-www-form-urlencoded

COM_CODE=635188&USER_ID=astroscorp&USER_PASSWD=<password>
→ 쿠키에서 ec_req_sid 추출
```

> 상세 기술 문서: [07-internal-api-reverse-engineering.md](07-internal-api-reverse-engineering.md)

---

## Claude Desktop 연동

`claude_desktop_config.json`에 다음을 추가합니다:

```json
{
  "mcpServers": {
    "ecount": {
      "command": "node",
      "args": ["/path/to/astrosECOUNT/build/index.js"],
      "env": {
        "ECOUNT_COM_CODE": "635188",
        "ECOUNT_USER_ID": "CHSHIN",
        "ECOUNT_API_CERT_KEY": "<키>",
        "ECOUNT_ZONE": "AA",
        "ECOUNT_LAN_TYPE": "ko-KR"
      }
    }
  }
}
```
