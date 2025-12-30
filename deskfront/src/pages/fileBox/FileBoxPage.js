import React from "react";
import BasicLayout from "../../layouts/BasicLayout";
import useFileBox from "../../hooks/useFileBox";
import FileComponent from "../../components/fileBox/FileComponent";
import { useSelector } from "react-redux"; // 로그인 정보 가져오기용

const FileBoxPage = () => {
  // 로그인한 사용자 정보 (slice 이름은 프로젝트 설정에 따라 다를 수 있음. memberSlice 가정)
  const loginState = useSelector((state) => state.loginSlice);
  const email = loginState?.email;

  const {
    fileList,
    loading,
    pageParam,
    movePage,
    handleDownload,
    handleDelete,
  } = useFileBox(email);

  return (
    <BasicLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            📂 내 파일 보관함
          </h1>
          <div className="text-sm text-gray-500">
            Total:{" "}
            <span className="font-bold text-blue-600">
              {fileList?.length || 0}
            </span>{" "}
            files
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* 파일 그리드 */}
            {fileList && fileList.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {fileList.map((file) => (
                  <FileComponent
                    key={file.uuid}
                    file={file}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-gray-50 rounded-lg border-dashed border-2 border-gray-200">
                <p className="text-gray-400 text-lg">보관된 파일이 없습니다.</p>
              </div>
            )}

            {/* 페이지네이션 (간단 구현) */}
            <div className="mt-10 flex justify-center gap-2">
              {/* PageComponent 등을 import해서 쓰는 것이 좋으나 예시로 버튼 구현 */}
              <button
                disabled={pageParam.page === 1}
                onClick={() => movePage(pageParam.page - 1)}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
              >
                Prev
              </button>
              <span className="px-4 py-2 font-bold">{pageParam.page}</span>
              <button
                onClick={() => movePage(pageParam.page + 1)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </BasicLayout>
  );
};

export default FileBoxPage;
