package com.desk.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FileItemDTO {

    private int ord;
    private String uuid;          // [NEW] 삭제 시 식별용
    private String originalName;  // 화면에 보여줄 파일명
    private String ext;           // ".pdf", ".jpg"
    private long size;            // bytes
    private boolean image;        // 이미지 여부

    private String savedName;     // 저장된 파일명 (uuid_원본명) - 필요하면 노출
    private String viewUrl;       // /api/files/view/{savedName}
    private String previewUrl;    // 이미지면 썸네일, 문서면 아이콘 url
    private String downloadUrl;   // [NEW] 다운로드 링크
}