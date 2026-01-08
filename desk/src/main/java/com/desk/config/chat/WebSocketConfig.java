package com.desk.config.chat;

import com.desk.dto.MemberDTO;
import com.desk.util.JWTUtil;
import lombok.extern.log4j.Log4j2;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSocketMessageBroker
@Log4j2
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {

                StompHeaderAccessor accessor =
                        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor == null) return message;

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // 1순위: SecurityContext에서 인증 정보 가져오기 (JWTCheckFilter에서 설정됨)
                    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                    
                    if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof MemberDTO) {
                        MemberDTO memberDTO = (MemberDTO) auth.getPrincipal();
                        accessor.setUser((Principal) () -> memberDTO.getEmail());
                        log.info("[WebSocket] SecurityContext 기반 인증 성공 | email={}", memberDTO.getEmail());
                        return message;
                    }
                    
                    // 2순위: SecurityContext에 없으면 헤더에서 직접 확인 (폴백)
                    List<String> authHeaders = accessor.getNativeHeader("Authorization");

                    if (authHeaders == null || authHeaders.isEmpty()) {
                        log.warn("[WebSocket] Authorization 헤더 없음 (SecurityContext에도 없음)");
                        return null;
                    }

                    String authHeader = authHeaders.get(0);
                    if (!authHeader.startsWith("Bearer ")) {
                        log.warn("[WebSocket] Bearer 형식 아님");
                        return null;
                    }

                    try {
                        String token = authHeader.substring(7);
                        Map<String, Object> claims = JWTUtil.validateToken(token);
                        String email = (String) claims.get("email");

                        if (email == null || email.isBlank()) {
                            log.warn("[WebSocket] email claim 없음");
                            return null;
                        }

                        accessor.setUser((Principal) () -> email);
                        log.info("[WebSocket] 헤더 기반 인증 성공 (폴백) | email={}", email);
                    } catch (Exception e) {
                        log.warn("[WebSocket] 인증 실패 | error={}", e.getMessage());
                        return null;
                    }
                }

                return message;
            }
        });
    }
}
