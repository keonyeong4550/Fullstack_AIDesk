import React from 'react';
import { API_SERVER_HOST } from '../../api/memberApi';

const FilePreview = ({ file, isLocal = false }) => {
    // 가공된 displayName이 있으면 사용, 없으면 원본 fileName 사용
    const name = isLocal ? file.name : (file.displayName || file.fileName || "");
    const uuid = isLocal ? null : file.uuid;

    // [수정 포인트] image 속성이 없으므로 확장자 정규식으로 판별
    // 1. 로컬 파일(업로드 전)은 브라우저가 제공하는 file.type으로 판별
    // 2. 서버 파일은 파일명 끝이 이미지 확장자인지 정규식으로 판별
    const isImage = isLocal
        ? file.type?.startsWith('image/')
        : (name && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name));

    const imageUrl = isLocal
        ? URL.createObjectURL(file)
        : (uuid ? `${API_SERVER_HOST}/api/files/view/${uuid}` : null);

    if (isImage && imageUrl) {
        return (
            <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover block"
                onError={(e) => {
                    // 이미지 로드 실패 시 (예: 파일이 깨졌거나 경로가 잘못됨)
                    e.target.style.display = 'none';
                    const container = e.target.parentNode;
                    if (container) {
                        container.style.backgroundColor = '#f3f4f6';
                        container.style.display = 'flex';
                        container.style.alignItems = 'center';
                        container.style.justifyContent = 'center';
                        container.innerHTML = '<span style="font-size:10px; color:#9ca3af; font-weight:bold;">IMG ERR</span>';
                    }
                }}
            />
        );
    }

    // 이미지가 아닌 경우 (파일 아이콘 처리)
    const ext = name ? name.split('.').pop().toUpperCase() : 'FILE';
    const colors = { PDF: '#E53E3E', ZIP: '#D69E2E', XLSX: '#38A169', DOCX: '#3182CE',
                    TXT: '#718096',MP3: '#805AD5', MP4: '#ED64A6' };
    const bgColor = colors[ext] || '#A0AEC0';

    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-white font-bold" style={{ backgroundColor: bgColor }}>
            <div className="text-[8px] opacity-80">FILE</div>
            <div className="text-[12px]">{ext}</div>
        </div>
    );
};

export default FilePreview;