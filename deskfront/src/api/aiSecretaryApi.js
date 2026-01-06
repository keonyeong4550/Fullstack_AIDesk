import axios from "axios";
import jwtAxios from "../util/jwtUtil";
import { API_SERVER_HOST } from "./memberApi";

const PYTHON_API_URL = "http://localhost:8000/api/v1";
const AI_API_KEY = "my-super-secret-key-shared-with-java";

const aiClient = axios.create({
  baseURL: PYTHON_API_URL,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": AI_API_KEY,
  },
});

export const aiSecretaryApi = {
  sendMessage: async (payload) => {
    try {
      const response = await aiClient.post("/chat", payload);
      return response.data;
    } catch (error) {
      console.error("AI Chat Error:", error);
      throw error;
    }
  },

  // ✅ [NEW] 회의록 오디오 분석 API
  analyzeMeetingAudio: async (audioFile, conversationId) => {
    try {
      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("conversation_id", conversationId);

      const response = await aiClient.post("/analyze-audio", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      // 위 AIChatWidget.js에서 response.data.transcription 등을 참조하므로
      // Python 서버가 { "transcription": "..." } 형태로 리턴해줘야 함
      return response.data;
    } catch (error) {
      console.error("Audio Analysis Error:", error);
      throw error;
    }
  },

  submitTicket: async (ticketData, files, writerEmail) => {
    try {
      const formData = new FormData();

      // 날짜 포맷팅 (YYYY-MM-DD -> YYYY-MM-DD HH:mm) - 백엔드 타입에 맞추기 위한 전처리
      let finalDeadline = ticketData.deadline;
      if (finalDeadline && finalDeadline.length === 10) {
        finalDeadline += " 09:00";
      }
      // 수신자가 문자열(user1, user2)인 경우 배열로 변환
      let receiverArray = ticketData.receivers;
      if (typeof receiverArray === "string") {
        receiverArray = receiverArray
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== "");
      }

      // 백엔드 @RequestPart("ticket")와 매핑될 JSON 데이터
      const ticketPayload = {
        title: ticketData.title,
        content: ticketData.content,
        purpose: ticketData.purpose,
        requirement: ticketData.requirement,
        grade: ticketData.grade,
        deadline: finalDeadline,
        receivers: receiverArray,
      };

      // 중요: JSON을 Blob으로 변환하여 'ticket' 파트에 추가
      // multipart/form-data에서는 문자열, 파일, Blob만 명확하게 인식됨 (JSON 객체를 그대로 넣으면 안됨)
      // JSON을 파일처럼 인식시키기 위해 Blob으로 감싸야하고 하지 않으면 - @RequestPart("ticket") 바인딩 실패 (값이 null로 들어감)
      formData.append(
        "ticket",
        new Blob([JSON.stringify(ticketPayload)], { type: "application/json" })
      );

      // 파일들을 'files' 파트에 추가
      if (files && files.length > 0) {
        files.forEach((file) => {
          formData.append("files", file);
        });
      }

      // 실제 서버 요청
      const response = await jwtAxios.post(
        `${API_SERVER_HOST}/api/tickets`,
        formData,
        {
          params: { writer: writerEmail },
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      return response.data;
    } catch (error) {
      console.error("API 전송 에러 상세:", error.response || error);
      throw error;
    }
  },
  // [수정] 요약 요청 함수 (텍스트로 받기)
  getSummary: async (ticketData, file) => {
    try {
      const formData = new FormData();

      // 1. 텍스트 데이터 추가
      formData.append("title", ticketData.title || "");
      formData.append("content", ticketData.content || "");
      formData.append("purpose", ticketData.purpose || "");
      formData.append("requirement", ticketData.requirement || "");

      // 2. 파일이 있다면 추가 (첫 번째 파일만 처리 예시)
      if (file) {
        formData.append("file", file);
      }

      // 3. API 호출 (Content-Type은 axios가 자동으로 multipart로 설정함)
      const res = await jwtAxios.post(
        `${API_SERVER_HOST}/api/ai/summary`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return res.data;
    } catch (err) {
      console.error("요약 API 에러:", err);
      throw err; // 에러를 위로 던져서 위젯에서 처리
    }
  },
  downloadPdf: async (
    ticketData,
    { file, title, content, purpose, requirement }
  ) => {
    try {
      const formData = new FormData();

      // 텍스트 데이터 추가
      formData.append("title", ticketData.title || "");
      formData.append("content", ticketData.content || "");
      formData.append("purpose", ticketData.purpose || "");
      formData.append("requirement", ticketData.requirement || "");

      // 파일이 있으면 추가
      if (file) {
        formData.append("file", file);
      }

      const response = await jwtAxios.post(
        `${API_SERVER_HOST}/api/ai/summarize-report`,
        formData,
        {
          params: {
            title,
            content,
            purpose,
            requirement,
          },
          responseType: "arraybuffer", // PDF 파일 깨짐 방지
          // headers: {
          //   "Content-Type": "multipart/form-data", // 파일 전송 헤더
          // },
          validateStatus: () => true,
        }
      );

      return response.data || response;
    } catch (error) {
      console.error("API - PDF 다운로드 오류:", error);
      throw error;
    }
  },
  // [수정] 요약 객체(파란창)를 그대로 보내 PDF 받기
  downloadSummaryPdf: async (summary) => {
    // 1. 서버가 싫어하는 null 값을 빈 문자열("")로 바꿔치기
    const safeSummary = {
      ...summary,
      conclusion: summary.conclusion || "", // conclusion이 null이면 ""로 변경
    };

    // 2. summary 대신 safeSummary를 전송
    const res = await jwtAxios.post(
      `${API_SERVER_HOST}/api/ai/summary-pdf`,
      safeSummary,
      {
        responseType: "arraybuffer",
        validateStatus: () => true,
      }
    );
    return res;
  },
};
