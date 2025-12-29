import axios from "axios";
import jwtAxios from "../util/jwtUtil";
// [핵심 수정 1] 백엔드 호스트 주소(API_SERVER_HOST)를 가져옵니다.
import { API_SERVER_HOST } from "./memberApi";

// ----------------------------------------------------------------
// [환경 설정]
// Python AI 서버 주소 (FastAPI)
const PYTHON_API_URL = "http://localhost:8000/api/v1";

// Python 서버 보안 키 (pythonai/app/core/config.py의 BACKEND_API_KEY와 일치해야 함)
const AI_API_KEY = "my-super-secret-key-shared-with-java";

// Python AI 서버용 클라이언트 (별도 Axios 인스턴스)
const aiClient = axios.create({
  baseURL: PYTHON_API_URL,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": AI_API_KEY,
  },
});

export const aiSecretaryApi = {
  /**
   * [AI 채팅 및 분석 요청]
   * Python FastAPI 서버로 요청을 보냅니다.
   */
  sendMessage: async (payload) => {
    try {
      const response = await aiClient.post("/chat", payload);
      return response.data; // MediationResponse 반환
    } catch (error) {
      console.error("AI Chat Error:", error);
      throw error;
    }
  },

  /**
   * [티켓 최종 전송]
   * Java Backend (/api/tickets)로 티켓 생성 요청
   *
   * [수정 내역 및 분석]
   * 1. 기존 코드의 "/api/tickets"는 baseURL이 없어서 프론트엔드(localhost:3000)로 요청됨 -> 404 발생
   * 2. 이를 `${API_SERVER_HOST}/api/tickets`로 변경하여 백엔드(localhost:8080)로 명확히 타겟팅함
   * 3. 이로써 Payload가 Spring Boot 컨트롤러에 도달하고, JPA를 통해 실제 DB에 INSERT 됨.
   */
  submitTicket: async (ticketData, writerDept) => {
    // [Validation] 수신자 리스트가 비어있으면 전송 불가 (DB 무결성 보호)
    if (!ticketData.receivers || ticketData.receivers.length === 0) {
      console.error("Validation Failed: No receivers assigned.");
      throw new Error(
        "담당자가 지정되지 않았습니다. AI 대화를 통해 담당자를 확정해 주세요."
      );
    }

    try {
      // [날짜 포맷팅]
      // AI가 'YYYY-MM-DD'형태로 주면 뒤에 시간을 붙여 Java LocalDateTime 포맷(yyyy-MM-dd HH:mm) 준수
      let finalDeadline = ticketData.deadline;
      if (finalDeadline && finalDeadline.length === 10) {
        finalDeadline += " 09:00";
      }

      const payload = {
        title: ticketData.title,
        content: ticketData.content,
        purpose: ticketData.purpose,
        requirement: ticketData.requirement,
        grade: ticketData.grade,
        deadline: finalDeadline,
        receivers: ticketData.receivers, // 검증된 수신자 리스트
      };

      // [핵심 수정 2] 절대 경로 사용
      // jwtAxios를 사용하여 헤더에 'Authorization: Bearer 토큰'을 자동 주입
      const response = await jwtAxios.post(
        `${API_SERVER_HOST}/api/tickets`,
        payload,
        {
          params: { writer: writerDept },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Submit Ticket Error:", error);
      throw error;
    }
  },

  /**
   * [헬스 체크]
   * Python 서버 생존 여부 확인
   */
  checkHealth: async () => {
    try {
      const response = await aiClient.get("/health");
      return response.status === 200;
    } catch (error) {
      return false;
    }
  },
};
