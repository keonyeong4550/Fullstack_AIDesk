package com.desk.service;

import com.desk.config.OllamaConfig;
import com.desk.dto.MeetingMinutesDTO;
import com.desk.domain.Member;
import com.desk.repository.MemberRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import java.io.ByteArrayOutputStream;

import com.itextpdf.io.font.PdfEncodings;


import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;


@Service
@RequiredArgsConstructor
@Log4j2
public class OllamaServiceImpl implements OllamaService {

    private final ObjectMapper objectMapper;
    private final OllamaConfig ollamaConfig;
    private final MemberRepository memberRepository; // 담당자
    // [수정] 파일과 텍스트를 받아서 AI에게 요청
    @Override
    public MeetingMinutesDTO getMeetingInfoFromAi(MultipartFile file, String title, String content, String purpose, String requirement) {

        // 1. 파일 내용 추출
        StringBuilder extractedText = new StringBuilder();

        // 1-1. 기존 입력 텍스트 추가
        if (content != null && !content.trim().isEmpty()) {
            extractedText.append("[사용자 입력 내용]:\n").append(content).append("\n\n");
        }

        // 1-2. 파일 텍스트 추출 및 추가
        if (file != null && !file.isEmpty()) {
            try {
                String fileContent = extractTextFromFile(file);
                extractedText.append("[첨부 파일 내용]:\n").append(fileContent).append("\n\n");
            } catch (Exception e) {
                log.error("파일 읽기 실패", e);
                // 파일 읽기 실패해도 멈추지 않고 진행
                extractedText.append("(파일 내용을 읽을 수 없습니다.)\n");
            }
        }

        String finalContent = extractedText.toString();

        // [중요] 가상의 회의록 생성 금지: 내용이 아예 없으면 에러 발생시킴
        if (finalContent.trim().isEmpty()) {
            throw new RuntimeException("분석할 내용이 없습니다. 내용을 입력하거나 파일을 첨부해주세요.");
        }

        String url = ollamaConfig.getBaseUrl() + "/api/generate";

        // -----------------------------------------------------------
        // [프롬프트 수정] 티켓 필드(제목, 목적, 상세, 마감일) 매핑 강화
        // -----------------------------------------------------------
        String prompt = String.format(
                "당신은 전문 회의 기록관이자 프로젝트 매니저입니다. 입력된 자료를 분석하여 업무 티켓을 생성할 수 있도록 정리하세요.\n" +
                        "없는 내용은 '내용 없음'으로, 날짜가 없으면 비워두세요.\n\n" +
                        "### 작성 지침 ###\n" +
                        "1. **title**: 업무 티켓의 제목으로 적합한 한 줄 (예: 'OOO 프로젝트 기획 회의 결과')\n" +
                        "2. **overview**: (목적) 이 업무를 왜 해야 하는지 배경과 목적 기술\n" +
                        "3. **details**: (상세) 구체적으로 수행해야 할 요구사항 나열\n" +
                        "4. **shortSummary**: (요약) 전체 내용을 3줄로 핵심 요약\n" +
                        "5. **attendees**: (담당자) 회의 참석자나 담당자 이름을 배열로 추출\n" +
                        "6. **deadline**: 본문에 마감 기한이나 날짜(YYYY-MM-DD)가 명시되어 있다면 추출, 없으면 빈 문자열(\"\")\n\n" +
                        "7. **conclusion**: (결론) 회의에서 도출된 최종 결론 및 향후 계획을 명확하게 기술\n\n" +
                        "### 출력 포맷 (JSON) ###\n" +
                        "{\n" +
                        "  \"title\": \"...\",\n" +
                        "  \"overview\": \"...\",\n" +
                        "  \"details\": \"...\",\n" +
                        "  \"shortSummary\": \"...\",\n" +
                        "  \"attendees\": [\"이름1\", \"이름2\"],\n" +
                        "  \"deadline\": \"YYYY-MM-DD\"\n" +
                        "}\n\n" +
                        "### 입력 데이터 ###\n" +
                        "제목: %s\n목적: %s\n요구사항: %s\n본문 및 파일내용:\n%s",
                title, purpose, requirement, finalContent
        );
        return callOllamaApi(url, prompt); // (중복 코드 줄이기 위해 아래 메서드로 분리함)
    }

    private String extractTextFromFile(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        if (filename == null) return "";

        String lowerFilename = filename.toLowerCase();

        // [추가] 오디오 파일이 넘어왔을 경우 처리 (Java에서 직접 분석 불가하므로 안내 메시지 반환)
        if (lowerFilename.endsWith(".mp3") || lowerFilename.endsWith(".wav") ||
                lowerFilename.endsWith(".m4a") || lowerFilename.endsWith(".flac")) {
            log.warn("Audio file detected in Java backend: {}", filename);
            return "(오디오 파일이 첨부되었습니다. 오디오 내용은 텍스트 변환 기능을 통해 본문에 포함시켜 주세요.)";
        }

        // 1. 텍스트 파일 (.txt, .md, .log)
        if (lowerFilename.endsWith(".txt") || lowerFilename.endsWith(".md") || lowerFilename.endsWith(".log")) {
            return new String(file.getBytes(), StandardCharsets.UTF_8);
        }

        // 2. PDF 파일 (.pdf) - iText 사용
        if (lowerFilename.endsWith(".pdf")) {
            try (PdfReader reader = new PdfReader(file.getInputStream());
                 PdfDocument pdfDoc = new PdfDocument(reader)) {
                StringBuilder text = new StringBuilder();
                for (int i = 1; i <= pdfDoc.getNumberOfPages(); i++) {
                    text.append(PdfTextExtractor.getTextFromPage(pdfDoc.getPage(i))).append("\n");
                }
                return text.toString();
            }
        }

        return "지원하지 않는 파일 형식입니다 (텍스트 내용 추출 불가).";
    }

    // [헬퍼] AI 호출 공통 로직
    private MeetingMinutesDTO callOllamaApi(String url, String prompt) {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", ollamaConfig.getModelName());
        requestBody.put("prompt", prompt);
        requestBody.put("format", "json");
        requestBody.put("stream", false);
        Map<String, Object> options = new HashMap<>();
        options.put("num_ctx", 4096);
        requestBody.put("options", options);

        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            String apiKey = ollamaConfig.getApiKey();  // ollamaConfig에서 가져오기
            if (apiKey != null && !apiKey.isEmpty()) {
                headers.set("x-api-key", apiKey);
            }

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            String jsonStr = root.path("response").asText();
            MeetingMinutesDTO result = objectMapper.readValue(jsonStr, MeetingMinutesDTO.class);

            // [추가] attendees의 nickname을 email로 변환
            if (result.getAttendees() != null && !result.getAttendees().isEmpty()) {
                List<String> emailList = new ArrayList<>();
                for (String attendee : result.getAttendees()) {
                    if (attendee == null || attendee.trim().isEmpty()) continue;

                    // nickname으로 DB 조회
                    Optional<Member> foundMember = memberRepository.findByNickname(attendee.trim());
                    if (foundMember.isPresent()) {
                        String email = foundMember.get().getEmail();
                        emailList.add(email);
                        log.info("담당자 변환: {} -> {}", attendee, email);
                    } else {
                        // 찾지 못한 경우 로그만 남기고 제외
                        log.warn("담당자를 찾을 수 없음: {}", attendee);
                    }
                }
                result.setAttendees(emailList);
            }

            return result;

        } catch (Exception e) {
            log.error("AI 요청 실패", e);
            throw new RuntimeException("AI 처리 실패: " + e.getMessage());
        }
    }
    @Override
    public byte[] generatePdf(MeetingMinutesDTO summary) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);

            // A4 용지 설정
            Document document = new Document(pdf, PageSize.A4);
            document.setMargins(40, 40, 40, 40); // 여백 주기

            // -----------------------------------------------------------
            // 1. 한글 폰트 설정 (맑은 고딕)
            // -----------------------------------------------------------
            String FONT_PATH = "C:/Windows/Fonts/malgun.ttf";
            PdfFont koreanFont = PdfFontFactory.createFont(FONT_PATH, PdfEncodings.IDENTITY_H);
            document.setFont(koreanFont); // 문서 전체 기본 폰트 설정

            // -----------------------------------------------------------
            // 2. 문서 제목 ("회 의 록") - 가운데 정렬, 크게
            // -----------------------------------------------------------
            Paragraph title = new Paragraph("회 의 록")
                    .setFontSize(24)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(30);
            document.add(title);

            // -----------------------------------------------------------
            // 3. 표 만들기 (4칸짜리 그리드 시스템 사용)
            // -----------------------------------------------------------
            // 열 비율: [제목라벨(1) : 내용(1) : 날짜라벨(1) : 내용(1)]
            // 전체 너비 100% 사용
            float[] columnWidths = {1, 2, 1, 2};
            Table table = new Table(UnitValue.createPercentArray(columnWidths));
            table.setWidth(UnitValue.createPercentValue(100));

            // [1행] 회의 제목 (오른쪽 3칸 합치기)
            table.addCell(createHeaderCell("회의 제목"));
            table.addCell(createValueCell(summary.getTitle(), 1, 3)); // rowspan 1, colspan 3

            // [2행] 회의 날짜 | [값] | 마감 날짜 | [값]
            String today = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            String deadline = (summary.getDeadline() != null)
//                    ? summary.getDeadline().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                    ? LocalDate.now().plusDays(7).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                    : "-";

            table.addCell(createHeaderCell("회의 날짜"));
            table.addCell(createValueCell(today, 1, 1));
            table.addCell(createHeaderCell("마감 날짜"));
            table.addCell(createValueCell(deadline, 1, 1));

            // [3행] 참석자 (큰 박스, 4칸 합치기)
            String attendees = (summary.getAttendees() != null) ? summary.getAttendees().toString() : "";
            table.addCell(createBigCell("참석자:\n" + attendees, 60)); // 높이 60

            // [4행] 회의 개요 및 목적 (큰 박스)
            String overview = (summary.getOverview() != null) ? summary.getOverview() : "";
            table.addCell(createBigCell("회의 개요 및 목적:\n" + overview, 80)); // 높이 80

            // [5행] 상세 논의 사항 (가장 큰 박스)
            String details = (summary.getDetails() != null) ? summary.getDetails() : "";
            table.addCell(createBigCell("상세 논의 사항\n\n" + details, 250)); // 높이 250 (제일 크게)

            // [6행] 결론 및 향후 계획 (큰 박스)
            String conclusion = (summary.getConclusion() != null) ? summary.getConclusion() : "";
            table.addCell(createBigCell("결론 및 향후 계획\n\n" + conclusion, 100)); // 높이 100

            // 표를 문서에 추가
            document.add(table);

            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    // 1. 회색 배경의 헤더 칸 만들기 (선택 사항: 심플하게 흰색으로 하려면 setBackgroundColor 삭제)
    private Cell createHeaderCell(String text) {
        return new Cell()
                .add(new Paragraph(text).setBold())
                .setTextAlignment(TextAlignment.CENTER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setPadding(5);
    }

    // 2. 일반 값 칸 만들기 (Colspan 지원)
    private Cell createValueCell(String text, int rowSpan, int colSpan) {
        return new Cell(rowSpan, colSpan)
                .add(new Paragraph(text != null ? text : ""))
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setPadding(5);
    }

    // 3. 내용이 들어가는 큰 박스 만들기 (높이 지정 가능)
    private Cell createBigCell(String content, float minHeight) {
        return new Cell(1, 4) // 무조건 가로 4칸 차지
                .add(new Paragraph(content))
                .setMinHeight(minHeight) // 최소 높이 설정 (내용이 많으면 늘어남)
                .setPadding(10)
                .setVerticalAlignment(VerticalAlignment.TOP); // 글자는 위에서부터 시작
    }
}