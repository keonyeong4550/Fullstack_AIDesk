import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchFilesAsync, refreshFiles } from "../slices/fileBoxSlice";
import { deleteFileApi, downloadFileApi } from "../api/fileBoxApi";

const useFileBox = (email) => {
  const dispatch = useDispatch();
  const { fileList, loading, totalCount, refresh } = useSelector(
    (state) => state.fileBox
  );

  // 페이지네이션 (12개씩 그리드로 보여주기)
  const [pageParam, setPageParam] = useState({ page: 1, size: 12 });

  // 데이터 로딩
  useEffect(() => {
    if (email) {
      dispatch(fetchFilesAsync({ pageParam, filter: { email } }));
    }
  }, [dispatch, pageParam, refresh, email]);

  // 페이지 이동
  const movePage = (pageNum) => {
    setPageParam((prev) => ({ ...prev, page: pageNum }));
  };

  // ✅ [Pro Tip] 다운로드 핸들러
  const handleDownload = useCallback(async (fileName, originalName) => {
    try {
      const response = await downloadFileApi(fileName);

      // Blob 데이터 생성
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // 파일명 설정 (서버 헤더가 복잡할 수 있으므로, 프론트가 알고 있는 originalName 사용 권장)
      link.setAttribute("download", originalName || fileName);

      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download Error:", error);
      alert("파일 다운로드 중 문제가 발생했습니다.");
    }
  }, []);

  // ✅ [Pro Tip] 삭제 핸들러 (Optimistic Update 대신 확실한 refresh 사용)
  const handleDelete = useCallback(
    async (uuid) => {
      if (
        !window.confirm(
          "정말로 이 파일을 삭제하시겠습니까? 복구할 수 없습니다."
        )
      )
        return;

      try {
        await deleteFileApi(uuid, email);
        // 성공 시 리스트 갱신 트리거
        dispatch(refreshFiles());
      } catch (error) {
        console.error("Delete Error:", error);
        alert("파일을 삭제할 수 없습니다. (권한이 없거나 이미 삭제됨)");
      }
    },
    [dispatch, email]
  );

  return {
    fileList,
    loading,
    totalCount,
    pageParam,
    movePage,
    handleDownload,
    handleDelete,
  };
};

export default useFileBox;
