package com.desk.domain;

import jakarta.persistence.Embeddable;
import lombok.*;

@Embeddable // JPA 내장타입으로 사용하기 위한 어노테이션
@Getter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UploadTicketFile {

    // DB에 분리 저장할 필드들
    private String uuid;          // 저장용 UUID
    private String originalName;  // 사용자가 올린 원본 파일명(확장자 포함)
    private String ext;           // ".jpg", ".pdf" (점 포함 추천)

    private long size;            // bytes
    private boolean image;        // 이미지 여부

    private int ord;

    public void setOrd(int ord) {
        this.ord = ord;
    }

    public String getLink() {
        return uuid + "_" + originalName;
    }


}
