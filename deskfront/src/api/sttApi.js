// import axios from "axios"; // 기존 axios 제거
import jwtAxios from "../util/jwtUtil"; // 프로젝트의 jwtAxios 경로로 수정하세요
const API_SERVER_HOST = process.env.REACT_APP_API_SERVER_HOST;

const API_BASE_URL = `${API_SERVER_HOST}/api/stt`;

export const sttApi = {
  uploadAudio: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      // jwtAxios를 사용하면 Authorization 헤더가 자동으로 붙습니다.
      // FormData를 사용할 때는 Content-Type 헤더를 명시적으로 설정하지 않아야 합니다.
      // axios가 자동으로 boundary를 포함한 올바른 multipart/form-data 헤더를 설정합니다.
      const response = await jwtAxios.post(`${API_BASE_URL}/upload`, formData, {
        timeout: 60000, // 60초 타임아웃 (대용량 파일 업로드 고려)
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      return response.data;
    } catch (error) {
      console.error("STT API Error:", error);
      throw error;
    }
  },
};

