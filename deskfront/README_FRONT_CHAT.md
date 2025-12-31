# 프론트엔드 채팅 백엔드 연결 가이드

## 수정한 파일 목록

### 1. 신규 생성 파일
- `src/api/chatApi.js` - REST API 클라이언트
- `src/api/chatWs.js` - WebSocket 클라이언트

### 2. 수정한 파일
- `src/components/chat/ChatListComponent.js` - 백엔드 API 연결
- `src/components/chat/ChatRoom.js` - 백엔드 API + WebSocket 연결
- `src/pages/chat/ChatPage.js` - 백엔드 API 연결
- `package.json` - WebSocket 라이브러리 추가

## 변경 사항

### 1. package.json
**변경 전**: WebSocket 라이브러리 없음
**변경 후**: 다음 라이브러리 추가
- `sockjs-client`: ^1.6.1
- `@stomp/stompjs`: ^7.0.0

**변경 이유**: 
- WebSocket 통신을 위한 필수 라이브러리
- STOMP 프로토콜 지원을 위해 필요

### 2. ChatListComponent.js
**주요 변경사항**:
- 목업 데이터(`INITIAL_ROOMS`, `MOCK_USERS`) 제거
- `getChatRooms()` API 호출로 채팅방 목록 로드
- `createGroupRoom()`, `createOrGetDirectRoom()` API 호출로 채팅방 생성
- 백엔드 응답을 프론트엔드 형식으로 변환하는 로직 추가

**기존 UI 유지**: 
- 모든 JSX 구조, 클래스명, 스타일 유지
- 모달 UI, 버튼 배치 등 기존 디자인 그대로 유지

### 3. ChatRoom.js
**주요 변경사항**:
- localStorage 기반 목업 메시지 제거
- `getMessages()` API 호출로 메시지 로드
- `chatWsClient`를 통한 WebSocket 연결
- `sendMessageRest()` REST API fallback 지원
- `markRead()`, `leaveRoom()`, `inviteUsers()` API 연결

**기존 UI 유지**:
- 메시지 렌더링 구조 유지
- 입력창, 버튼 배치 유지
- 무한 스크롤 훅(`useInfiniteChat`) 그대로 사용

### 4. ChatPage.js
**주요 변경사항**:
- 목업 데이터(`MOCK_ROOMS`) 제거
- `getChatRoom()` API 호출로 채팅방 정보 로드
- 로딩/에러 상태 처리 추가

**기존 UI 유지**:
- 컴포넌트 구조 유지
- 라우팅 로직 유지

## 데이터 매핑 규칙

### 채팅방 목록 (getChatRooms)
```javascript
// 백엔드 응답
{
  id: number,
  roomType: "DIRECT" | "GROUP",
  name: string | null,
  participants: [{ userId: string, nickname: string, ... }],
  lastMsgContent: string | null,
  lastMsgAt: LocalDateTime | null,
  unreadCount: number
}

// 프론트엔드 형식
{
  id: number,
  isGroup: boolean,
  name: string | null,
  participants: string[],
  participantInfo: [{ email: string, nickname: string }],
  lastMessage: { content: string, createdAt: string } | null,
  unreadCount: number,
  user1Id: string,  // 1:1 채팅용
  user2Id: string | null
}
```

### 메시지 (getMessages)
```javascript
// 백엔드 응답
{
  id: number,
  chatRoomId: number,
  messageSeq: number,
  senderId: string,
  senderNickname: string,
  messageType: "TEXT" | "TICKET_PREVIEW" | "SYSTEM",
  content: string,
  ticketId: number | null,
  createdAt: LocalDateTime
}

// 프론트엔드 형식
{
  id: number,
  chatRoomId: number,
  senderId: string,
  senderNickname: string,
  content: string,
  createdAt: string,
  isRead: boolean,
  isTicketPreview: boolean,
  ticketId: number | null,
  messageSeq: number
}
```

## 실행 방법

### 1. 의존성 설치
```bash
cd deskfront
npm install
```

### 2. 개발 서버 실행
```bash
npm start
```

### 3. 백엔드 서버 실행 확인
- 백엔드 서버가 `http://localhost:8080`에서 실행 중이어야 합니다.
- WebSocket 엔드포인트: `ws://localhost:8080/ws`

## 주요 기능

### 1. 채팅방 목록
- `/chat` 경로에서 채팅방 목록 표시
- 백엔드 API로 실시간 목록 로드
- 안 읽은 메시지 개수 표시

### 2. 채팅방 생성
- 1:1 채팅: `createOrGetDirectRoom()` - 기존 방이 있으면 반환, 없으면 생성
- 그룹 채팅: `createGroupRoom()` - 그룹 이름과 참여자 선택

### 3. 메시지 송수신
- WebSocket 우선 사용 (`/app/chat/send/{roomId}`)
- WebSocket 실패 시 REST API fallback (`POST /api/chat/rooms/{roomId}/messages`)
- 실시간 메시지 수신 (`/topic/chat/{roomId}`)

### 4. 읽음 처리
- 채팅방 진입 시 마지막 메시지 읽음 처리
- WebSocket으로 수신한 메시지 자동 읽음 처리

### 5. 채팅방 관리
- 나가기: `leaveRoom()` - 레코드 삭제하지 않고 status 변경
- 초대: `inviteUsers()` - 그룹 채팅방에만 가능

## 주의사항

1. **인증**: 모든 API 요청은 JWT 토큰을 자동으로 포함합니다 (`jwtAxios` 사용)
2. **WebSocket 인증**: WebSocket 연결 시 `Authorization: Bearer {token}` 헤더 필요
3. **에러 처리**: API 호출 실패 시 콘솔에 에러 로그 출력 및 사용자 알림
4. **재연결**: WebSocket 연결 실패 시 자동 재연결 시도 (최대 5회)

## 트러블슈팅

### WebSocket 연결 실패
- JWT 토큰이 유효한지 확인
- 백엔드 서버가 실행 중인지 확인
- CORS 설정 확인

### 메시지가 표시되지 않음
- 브라우저 콘솔에서 에러 확인
- WebSocket 연결 상태 확인 (헤더의 CONNECTED/DISCONNECTED 표시)
- REST API fallback 동작 확인

