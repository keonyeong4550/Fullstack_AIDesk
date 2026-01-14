
---
# 플로우 차트
### 회원가입
![Image](https://github.com/user-attachments/assets/6410cddb-48ba-4236-8925-0eeccee98953)
### 로그인 & 로그아웃
![Image](https://github.com/user-attachments/assets/567e6350-8457-4345-b443-bb4244ae3c55)
### 소셜 로그인
![Image](https://github.com/user-attachments/assets/a29963b8-a089-4703-90f4-fbd1cede31ed)
### 얼굴 등록(임베딩)
![Image](https://github.com/user-attachments/assets/c2dd5971-4b74-4074-adaa-46dbab1598b2)
### 얼굴 로그인(임베딩)
![Image](https://github.com/user-attachments/assets/f5c795e2-23be-489d-9bb0-7bd0c5ee395f)
### 관리자 페이지
![Image](https://github.com/user-attachments/assets/f6d31268-7d0e-4170-bba5-4ef5ac29f670)
### 티켓 목록
![Image](https://github.com/user-attachments/assets/9a6275a8-f951-46a4-9c6c-507ba0c8659c)
### 중요업무(장바구니)
![Image](https://github.com/user-attachments/assets/eea72182-d64d-4179-885f-e1e2868c8f87)
### 파일함
![Image](https://github.com/user-attachments/assets/49170c92-c9a7-48c9-bbc9-dbe1e1eef525)
### 메인페이지
![Image](https://github.com/user-attachments/assets/5947590c-473a-4a0d-a734-6b4f858fdef6)
---


# 트러블 슈팅

### 1️⃣ Refresh Token 쿠키가 변경되지 않는 문제

**문제 현상**

Refresh Token이 재발급되었지만 브라우저에 반영되지 않고, 브라우저가 계속 예전 Refresh Token을 전송하여 `REFRESH_REPLAY_DETECTED` 에러가 발생했습니다.

**원인 분석**

- 로컬 개발 환경(HTTP)에서 `Secure=true`와 `SameSite=None` 조합을 사용하여 브라우저가 쿠키를 거부했습니다.
- `response.addCookie()`와 `response.addHeader("Set-Cookie")`를 혼용하여 중복된 Set-Cookie 헤더가 생성되었습니다.

**해결 방법**

- 환경에 따른 동적 쿠키 설정: `request.isSecure()`로 환경을 감지하여 로컬 환경에서는 `Secure=false`, `SameSite=Lax`를 사용하고, 프로덕션 환경에서는 `Secure=true`, `SameSite=None`을 사용합니다.
- `ResponseCookie` 단일 사용: `response.addCookie()`를 제거하고 `response.addHeader("Set-Cookie", ...)`만 사용하여 일관성을 보장합니다.

**결과**

로컬 개발 환경과 프로덕션 환경 모두에서 Refresh Token이 브라우저에 올바르게 반영되었습니다.

---

### 2️⃣ Access Token 재발급 Race Condition 문제

**문제 현상**

Refresh Token을 이용한 Access Token 재발급이 일부 요청에서만 성공하고, 동시 요청 시 `REFRESH_REPLAY_DETECTED` 에러가 발생했습니다.

**원인 분석**

- JWT RTR 정책 적용으로 Refresh Token 사용 시마다 기존 토큰이 무효화됩니다.
- 프론트엔드 비동기 동시 요청과 충돌하여 Race Condition이 발생했습니다.
- Axios 인터셉터 내 `_retry` 플래그 설정 오류 및 변수 선언 문제가 있었습니다.

**해결 방법 — Subscriber 패턴 + 요청 대기열(Queue) 적용**

- `isRefreshing` 플래그로 토큰 갱신 중 다른 요청을 차단합니다.
- 대기열(`refreshSubscribers`)에 모든 추가 요청을 저장합니다.
- 첫 번째 요청 완료 시 새 토큰을 대기열 요청에 전달 후 재실행합니다.
- `_retry` 체크를 최상단으로 이동하여 무한 루프를 방지합니다.

**결과**

- 네트워크 효율성 증가: Refresh API 호출이 1회로 감소했습니다.
- 서버 RTR 정책 준수 및 `REFRESH_REPLAY_DETECTED` 에러 해결
- 사용자 경험 향상: 토큰 만료 시에도 흐름 끊김 없이 처리됩니다.

---

### 3️⃣ 관리자 페이지 인증 오류

**문제 현상**

관리자 페이지에서 인증 오류가 발생하여 접근이 불가능했습니다.

**원인 분석**

- `getClaims()`에서 비밀번호 반환을 제거했지만, `UsernamePasswordAuthenticationToken`에는 여전히 비밀번호가 필요했습니다.
- 비밀번호를 `null`로 처리하면 인증 오류가 발생했습니다.

**해결 방법**

- 임의 문자열 `"PROTECTED"`를 지정하여 인증 토큰을 생성하도록 수정했습니다.
- DTO와 인증 토큰 간 비밀번호 불일치 문제를 해결했습니다.

**결과**

관리자 페이지 접근 및 권한 로직이 정상 동작합니다.

---

### 4️⃣ 동적 쿼리 변환 이후 도메인 데이터 타입 문제

**문제 현상**

동적 쿼리 변환 이후 도메인 입력 타입과 동적 쿼리 구조가 불일치하여 에러가 발생했습니다.

**원인 분석**

- 기존 도메인 입력 타입과 동적 쿼리 구조가 맞지 않았습니다.

**해결 방법**

- 도메인 입력 타입을 변경하여 문제를 해결했습니다.

---

### 5️⃣ JWT 토큰 에러 (Pageable Sort)

**문제 현상**

`Pageable`의 `Sort.by("email").descending()` 사용 시 `JwtCheckFilter`에서 에러가 발생했습니다.

**원인 분석**

- Spring Data JPA가 `member.email` 형태의 JPQL 경로를 생성했습니다.
- `member`가 JPQL 예약어이거나 실제 쿼리 Alias와 일치하지 않아 오류가 발생했습니다.

**해결 방법**

- 해당 동적 정렬 로직을 제거하고 정적 정렬 방식으로 대체하여 적용했습니다.

---

### 6️⃣ 필터 및 정렬 파라미터 처리 오류

**문제 현상**

마감순 정렬 관련 필터가 `filterParam`(검색 포함) 쪽으로 전달되고 있었습니다.

**해결 방법**

- 정렬 관련 파라미터를 `pageParam`(정렬 포함) 쪽으로 분리하여 전송하도록 수정했습니다.
- 필터 + 정렬 로직이 정상적으로 동작하는 것을 확인했습니다.

---

### 7️⃣ 업무 현황 페이지 필터 처리 로직 오류

**문제 현상**

업무 현황 페이지의 필터 처리 로직을 전면 수정하는 과정에서 쿼리문 내 타입 불일치 및 함수 사용 오류가 발생했습니다.

**해결 방법**

- 필터 처리 관련 쿼리 로직을 하나씩 추적하여 문제 지점을 파악했습니다.
- 잘못된 타입 및 함수 사용 부분을 수정하여 정상 동작을 확인했습니다.

---

### 8️⃣ 파일 업로드 / 전송 오류

**문제 현상**

파일이 정상적으로 전달되지 않는 문제가 발생했습니다.

**해결 방법**

- Blob으로 감싸서 전송하도록 수정하여 정상 동작을 확인했습니다.

---

### 9️⃣ 이미지 및 파일 다운로드 인증 문제

**문제 현상**

`JwtCheckFilter`에서 이미지 조회 및 다운로드 요청도 토큰 검사로 막히는 문제가 발생했습니다.

**해결 방법**

- 이미지 조회 및 다운로드 로직은 토큰 검사 예외 처리하여 정상적으로 파일 로딩이 가능하도록 수정했습니다.

---

### 🔟 받은 티켓에서 파일이 보이지 않는 문제

**문제 현상**

받은 티켓(Read 화면)에서 파일이 보이지 않았습니다.

**원인 분석**

- 파일 조회용 DTO에 `file` 필드가 포함되지 않았습니다.

**해결 방법**

- DTO에 파일 정보를 추가하여 정상적으로 조회 가능하도록 수정했습니다.

---

### 1️⃣1️⃣ 티켓 삭제 시 파일이 남아있는 문제

**문제 현상**

티켓 삭제 시 DB에서는 파일이 삭제되지만 실제 파일이 남아있었습니다.

**원인 분석**

- JPA `cascade` 설정으로 DB 레코드는 삭제되지만, 실제 파일 시스템에서 파일을 삭제하는 로직이 존재하지 않았습니다.

**해결 방법**

- 티켓 삭제 로직에 실제 파일 삭제 처리 로직을 추가하여 동기화했습니다.

---

### 1️⃣2️⃣ AI 비서 메시지 권한 체크 오류

**문제 현상**

`main` 코드에서 `JwtCheckFilter`가 `api/ai` 로직을 우회하여 AI 비서 측에서 메시지 처리 시 권한 체크 에러가 발생했습니다.

**해결 방법**

- AI API 경로에 대한 권한 체크 로직을 수정했습니다.

---

### 1️⃣3️⃣ 회의록 파일 처리 오류

**문제 현상**

파일 전송 시 처리 오류가 발생했습니다.

**해결 방법**

- 파일 전송 시 Blob으로 감싸고, 컨트롤러에서는 `RequestParam` 대신 `RequestPart`로 처리하도록 수정했습니다.
- Axios 호출 시 header에 `access token`이 포함되더라도 param 처리 오류를 방지했습니다.

---

### 1️⃣4️⃣ 회원가입 중복 이메일 처리 오류

**문제 현상**

중복 이메일 가입 시 에러는 발생하지만 Front에 제대로 전달되지 않았습니다.

**해결 방법**

- 별도 예외 정의 및 핸들러 등록을 통해 Front에 적절한 alert 메시지가 표시되도록 개선했습니다.


---
