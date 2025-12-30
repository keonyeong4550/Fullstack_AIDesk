import React from "react";
import { getFileViewUrl } from "../../api/fileBoxApi";
import { API_SERVER_HOST } from "../../api/memberApi";
import {
  FaFilePdf,
  FaFileExcel,
  FaFileWord,
  FaFilePowerpoint,
  FaFileImage,
  FaFileLines,
  FaFileCode,
  FaFileZipper,
  FaDownload,
  FaTrash,
} from "react-icons/fa6";

// 확장자별 아이콘 매핑
const getFileIcon = (ext) => {
  const extension = ext ? ext.toLowerCase() : "";
  if (extension.includes("pdf"))
    return <FaFilePdf className="text-5xl text-red-500" />;
  if (extension.match(/xls|csv/))
    return <FaFileExcel className="text-5xl text-green-600" />;
  if (extension.match(/doc/))
    return <FaFileWord className="text-5xl text-blue-600" />;
  if (extension.match(/ppt/))
    return <FaFilePowerpoint className="text-5xl text-orange-500" />;
  if (extension.match(/zip|rar|7z/))
    return <FaFileZipper className="text-5xl text-gray-500" />;
  if (extension.match(/jpg|png|gif|jpeg/))
    return <FaFileImage className="text-5xl text-purple-500" />;
  if (extension.match(/js|java|html|css|py/))
    return <FaFileCode className="text-5xl text-slate-700" />;
  return <FaFileLines className="text-5xl text-gray-400" />;
};

const FileComponent = ({ file, onDownload, onDelete }) => {
  const isImage = file.image;

  // 썸네일 URL 처리 (서버에서 previewUrl을 잘 줬다고 가정하지만, 안전장치로 viewUrl 사용)
  // const thumbnailUrl =
  //   isImage && file.previewUrl
  //     ? `${file.previewUrl}`
  //     : getFileViewUrl(`s_${file.savedName}`);
  const thumbnailUrl = isImage ? `${API_SERVER_HOST}${file.previewUrl}` : null;
  console.log("파일이름", file.previewUrl);
  console.log("썸네일url", thumbnailUrl);

  // console.log("파일이름2", file.savedName);

  return (
    <div className="group relative bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      {/* 1. 상단 미리보기 영역 */}
      <div className="h-40 w-full bg-slate-50 flex items-center justify-center relative overflow-hidden group-hover:bg-slate-100 transition-colors">
        {isImage ? (
          <img
            src={thumbnailUrl}
            alt={file.originalName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              e.target.onerror = null; // 무한루프 방지
              // 이미지가 깨지면 아이콘으로 대체하기 위해 부모 요소를 조작하거나, 기본 이미지를 넣음
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex"; // 숨겨진 아이콘 표시
            }}
          />
        ) : (
          <div className="transform group-hover:scale-110 transition-transform duration-300">
            {getFileIcon(file.ext)}
          </div>
        )}

        {/* 이미지 로딩 실패 시 보여줄 백업 아이콘 (평소엔 숨김) */}
        <div className="hidden absolute inset-0 items-center justify-center">
          {getFileIcon(file.ext)}
        </div>

        {/* Hover Overlay (버튼들) */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[1px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(file.savedName, file.originalName);
            }}
            className="bg-white p-2.5 rounded-full text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-lg tooltip"
            title="다운로드"
          >
            <FaDownload />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(file.uuid);
            }}
            className="bg-white p-2.5 rounded-full text-gray-700 hover:text-red-500 hover:bg-red-50 transition-all shadow-lg tooltip"
            title="삭제"
          >
            <FaTrash />
          </button>
        </div>
      </div>

      {/* 2. 하단 정보 영역 */}
      <div className="p-3 border-t border-gray-100">
        <h3
          className="text-sm font-semibold text-gray-800 truncate mb-1"
          title={file.originalName}
        >
          {file.originalName}
        </h3>
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>{(file.size / 1024).toFixed(1)} KB</span>
          <span className="uppercase bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide">
            {file.ext.replace(".", "")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FileComponent;
