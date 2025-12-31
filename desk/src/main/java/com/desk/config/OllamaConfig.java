package com.desk.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Ollama 설정 클래스
 * 환경 변수로부터 Ollama 관련 설정을 주입받음
 */
@Configuration
@Getter
public class OllamaConfig {
    
    @Value("${ollama.base-url}")
    private String baseUrl;
    
    @Value("${ollama.api-key}")
    private String apiKey;
}

