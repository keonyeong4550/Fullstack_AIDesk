package com.desk.controller;

import com.desk.dto.TicketCreateDTO;
import com.desk.service.OllamaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final OllamaService ollamaService;

    // [수정] TicketCreateDTO -> Map<String, Object> 으로 변경 (400 에러 해결책)
    @PostMapping("/summarize-report")
    public ResponseEntity<String> getReportSummary(@RequestBody Map<String, Object> ticketMap) {

        // Map 데이터를 OllamaService로 넘겨서 처리
        String summary = ollamaService.generateSummaryFromMap(ticketMap);
        return ResponseEntity.ok(summary);
    }
}