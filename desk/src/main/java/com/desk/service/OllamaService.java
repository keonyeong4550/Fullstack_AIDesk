package com.desk.service;

import com.desk.dto.TicketCreateDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Log4j2
public class OllamaService {

    @Value("${ai.ollama.url}")
    private String ollamaUrl;

    @Value("${ai.ollama.model-name}")
    private String modelName;

    @Value("${ai.ollama.api-key}")
    private String apiKey;

    private final ObjectMapper objectMapper;

    // 티켓 내용을 받아서 요약문 생성
    public String generateSummary(TicketCreateDTO ticket) {
        String url = ollamaUrl + "/api/generate";

        // 프롬프트 엔지니어링: AI에게 역할을 부여합니다.
        String prompt = String.format(
                "당신은 유능한 업무 비서입니다. 아래의 업무 요청 내용을 바탕으로 'PDF 보고서용 요약문'을 작성해주세요.\n" +
                        "형식은 [개요] - [핵심 요구사항] - [기대 효과] 순으로 깔끔하게 3~4줄로 요약하세요.\n\n" +
                        "=== 업무 내용 ===\n" +
                        "제목: %s\n내용: %s\n목적: %s\n상세요구: %s\n",
                ticket.getTitle(), ticket.getContent(), ticket.getPurpose(), ticket.getRequirement()
        );

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", modelName); // "qwen3:8b"
        requestBody.put("prompt", prompt);
        requestBody.put("stream", false); // 한 번에 응답 받기

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            // JSON 파싱 (Ollama 응답 구조: { "response": "요약내용...", ... })
            JsonNode root = objectMapper.readTree(response.getBody());
            return root.path("response").asText();

        } catch (Exception e) {
            log.error("Ollama 요약 실패", e);
            return "AI 서버 연결 실패로 인해 요약을 생성할 수 없습니다.";
        }
    }

    // [추가] Map 데이터를 받아서 요약 (Controller 변경에 대응)
    public String generateSummaryFromMap(Map<String, Object> map) {
        // null 체크 하면서 값 꺼내기
        String title = (String) map.getOrDefault("title", "");
        String content = (String) map.getOrDefault("content", "");
        String purpose = (String) map.getOrDefault("purpose", "");
        String requirement = (String) map.getOrDefault("requirement", "");

        String url = ollamaUrl + "/api/generate";

        String prompt = String.format(
                "당신은 유능한 업무 비서입니다. 아래의 업무 요청 내용을 바탕으로 'PDF 보고서용 요약문'을 작성해주세요.\n" +
                        "형식은 [개요] - [핵심 요구사항] - [기대 효과] 순으로 깔끔하게 3~4줄로 요약하세요.\n\n" +
                        "=== 업무 내용 ===\n" +
                        "제목: %s\n내용: %s\n목적: %s\n상세요구: %s\n",
                title, content, purpose, requirement
        );

        // ... 아래 로직은 기존(generateSummary)과 완전히 동일합니다 ...
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", modelName);
        requestBody.put("prompt", prompt);
        requestBody.put("stream", false);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            headers.set("X-API-Key", apiKey);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            return root.path("response").asText();

        } catch (Exception e) {
            log.error("Ollama 요약 실패", e);
            return "AI 서버 연결 실패 또는 모델 오류로 요약을 생성할 수 없습니다.";
        }}
}