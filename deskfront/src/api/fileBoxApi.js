import jwtAxios from "../util/jwtUtil";
import { API_SERVER_HOST } from "./memberApi";

const host = `${API_SERVER_HOST}/api/files`;

// 파일 리스트 조회 (필터링 및 페이징 포함)
export const getFileList = async (pageParam, filter) => {
  // 백엔드에 /api/files/list 같은 엔드포인트가 있다고 가정하거나,
  // 티켓과 연동된 전체 파일 리스트를 가져오는 API를 호출
  // ✅ [수정된 주소] 백엔드 TicketController에 맞춰줍니다. (/api/tickets/files/all)
  const res = await jwtAxios.get(`${API_SERVER_HOST}/api/tickets/files/all`, {
    params: { ...pageParam, ...filter },
  });
  return res.data;
};

// 파일 다운로드 (Blob 처리)
export const downloadFileApi = async (fileName) => {
  const res = await jwtAxios.get(`${host}/download/${fileName}`, {
    responseType: "blob", // 중요: 바이너리 데이터로 받음
  });
  return res; // 헤더 정보(파일명 등)를 위해 res 자체를 반환하거나 res.data(blob)만 반환
};

// 파일 단일 삭제
export const deleteFileApi = async (uuid, writer) => {
  // TicketController에 정의된 삭제 경로: /api/tickets/{tno}/files/{uuid}
  const targetHost = `${API_SERVER_HOST}/api/tickets/files/${uuid}`;
  const res = await jwtAxios.delete(targetHost, {
    params: { writer },
  });
  return res.data;
};

// 이미지 미리보기용 URL 생성 (API 호출이 아닌 URL 문자열 반환)
export const getFileViewUrl = (savedName) => {
  return `${host}/view/${savedName}`;
};
