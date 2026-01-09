package com.desk.config;

import jakarta.servlet.MultipartConfigElement;
import org.modelmapper.ModelMapper;
import org.modelmapper.convention.MatchingStrategies;
import org.springframework.boot.web.servlet.MultipartConfigFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.unit.DataSize;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
// WebMvcConfigurer를 implements 하여 CORS 설정을 추가합니다.
public class RootConfig implements WebMvcConfigurer {

    @Bean
    public ModelMapper getMapper() {
        ModelMapper modelMapper = new ModelMapper();
        modelMapper.getConfiguration()
                .setFieldMatchingEnabled(true)
                .setFieldAccessLevel(org.modelmapper.config.Configuration.AccessLevel.PRIVATE)
                .setMatchingStrategy(MatchingStrategies.LOOSE);

        return modelMapper;
    }

    // CORS 설정을 여기에 추가합니다.
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // 모든 경로 허용
                .allowedOrigins("http://localhost:3002") // 리액트 주소 허용
                .allowedMethods("GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS")
                .allowCredentials(true)
                .allowedHeaders("*");
    }

    /**
     * 파일 업로드 설정 Bean
     * 대용량 오디오 파일 업로드를 위한 설정
     */
    @Bean
    public MultipartConfigElement multipartConfigElement() {
        MultipartConfigFactory factory = new MultipartConfigFactory();
        
        // 개별 파일 최대 크기: 50MB
        factory.setMaxFileSize(DataSize.ofMegabytes(50));
        
        // 전체 요청 최대 크기: 100MB
        factory.setMaxRequestSize(DataSize.ofMegabytes(100));
        
        // 임계값: 2MB 이상이면 디스크에 저장
        factory.setFileSizeThreshold(DataSize.ofMegabytes(2));
        
        return factory.createMultipartConfig();
    }
}