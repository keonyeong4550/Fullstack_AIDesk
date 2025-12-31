# Ollama Cloud 모델 Timeout 문제 해결

## 문제 분석

### 원인
1. **Cloud 모델의 응답 스트림 미종료**: `gpt-oss:20b-cloud` 같은 cloud 모델이 `stream=false`임에도 응답 스트림을 종료하지 않아 terminal signal이 오지 않음
2. **Reactor timeout 위치 문제**: `.timeout()`이 `flatMap` 내부에서 발생하면 `onErrorResume`이 제대로 동작하지 않음
3. **WebClient 레벨 timeout 부재**: 네트워크 레벨에서 hang이 발생하면 Reactor timeout만으로는 부족
4. **에러 타입 미분리**: `TimeoutException`, `WebClientResponseException`, 일반 `Exception`을 구분하지 않아 적절한 fallback이 동작하지 않음

### 기술적 배경
- **Reactor timeout**: Reactor 체인에서 지정된 시간 내에 데이터가 오지 않으면 `TimeoutException` 발생
- **WebClient timeout**: HTTP 클라이언트 레벨에서 연결/응답 timeout 설정
- **Cloud 모델 특성**: `remote_model` + `remote_host` 기반으로 외부 서버를 호출하므로 네트워크 지연/실패 가능성 높음

## 해결 방안

### 1. 다층 Timeout 구조

```java
// 레벨 1: WebClient 레벨 (네트워크)
HttpClient httpClient = HttpClient.create()
    .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)  // 연결: 5초
    .responseTimeout(Duration.ofSeconds(35))            // 응답: 35초
    .doOnConnected(conn -> 
        conn.addHandlerLast(new ReadTimeoutHandler(35))  // 읽기: 35초
            .addHandlerLast(new WriteTimeoutHandler(10)) // 쓰기: 10초
    );

// 레벨 2: Reactor 레벨 (비즈니스 로직)
.timeout(Duration.ofSeconds(30))  // WebClient보다 짧게 설정

// 레벨 3: Block 레벨 (동기 호출)
.block(Duration.ofSeconds(35))  // Reactor timeout보다 길게
```

### 2. Cloud 모델 감지 및 별도 처리

```java
private boolean isCloudModel(String modelName) {
    return modelName != null && modelName.toLowerCase().contains("cloud");
}

// Cloud 모델: 더 짧은 timeout 및 제한된 옵션
Duration timeoutDuration = isCloud ? Duration.ofSeconds(25) : Duration.ofSeconds(30);
Map<String, Object> options = getModelOptions(modelName, isCloud);
// Cloud 모델: num_predict=100, temperature=0.1
// 로컬 모델: num_predict=200, temperature=0.2
```

### 3. 명확한 에러 핸들링

```java
// WebClientResponseException: HTTP 에러 (4xx, 5xx)
.onErrorResume(WebClientResponseException.class, ex -> {
    log.error("[Ollama] HTTP 에러 | status={}", ex.getStatusCode());
    return Mono.just(fallbackResult);
})
// TimeoutException: Reactor timeout 발생
.onErrorResume(TimeoutException.class, ex -> {
    log.error("[Ollama] Timeout 발생 | timeout={}s", timeoutDuration.getSeconds());
    return Mono.just(fallbackResult);
})
// 기타 모든 예외
.onErrorResume(Exception.class, ex -> {
    log.error("[Ollama] 예외 발생 | type={}", ex.getClass().getSimpleName());
    return Mono.just(fallbackResult);
})
// 최종 안전장치
.onErrorReturn(fallbackResult);
```

### 4. flatMap 대신 map 사용

- **문제**: `flatMap` 내부에서 timeout이 발생하면 에러 전파가 불안정
- **해결**: `map` 연산자 사용으로 단순화하고 timeout이 명확히 전파되도록 함

## 수정된 코드 구조

### OllamaClient.filterMessage() 메서드

```java
public Mono<FilterResult> filterMessage(String originalMessage) {
    // 1. Cloud 모델 감지
    boolean isCloud = isCloudModel(modelName);
    Duration timeoutDuration = isCloud ? Duration.ofSeconds(25) : Duration.ofSeconds(30);
    
    // 2. WebClient 호출 (HttpClient 레벨 timeout 포함)
    return getWebClient()
        .post()
        .uri("/api/chat")
        .bodyValue(requestBody)
        .retrieve()
        .bodyToMono(Map.class)
        .timeout(timeoutDuration)  // Reactor 레벨 timeout
        .map(rawResponse -> {      // flatMap 대신 map 사용
            // 응답 처리
        })
        .onErrorResume(TimeoutException.class, ...)  // Timeout 명시적 처리
        .onErrorResume(WebClientResponseException.class, ...)  // HTTP 에러 처리
        .onErrorResume(Exception.class, ...)  // 기타 에러 처리
        .onErrorReturn(fallbackResult);  // 최종 안전장치
}
```

## 왜 이 수정으로 문제가 해결되는가?

1. **WebClient 레벨 timeout**: 네트워크 hang이 발생해도 35초 후 자동으로 연결 종료
2. **Reactor timeout (30초)**: WebClient timeout보다 짧게 설정하여 명시적으로 `TimeoutException` 발생
3. **에러 타입 분리**: `TimeoutException`을 명시적으로 처리하여 fallback이 확실히 동작
4. **map 사용**: `flatMap` 대신 `map`을 사용하여 에러 전파가 명확함
5. **Cloud 모델 별도 처리**: Cloud 모델은 더 짧은 timeout(25초)과 제한된 옵션으로 응답 시간 단축
6. **최종 안전장치**: `onErrorReturn`으로 모든 경우에 fallback 반환 보장

## Cloud 모델과 로컬 모델 함께 사용 시 주의사항

### 1. 모델 선택 전략
- 로컬 모델(`qwen3:8b`) 우선 사용
- Cloud 모델은 필요 시에만 사용 (더 긴 응답 시간, 네트워크 의존성)

### 2. Timeout 정책
- **로컬 모델**: 30초 timeout, `num_predict=200`
- **Cloud 모델**: 25초 timeout, `num_predict=100` (더 짧게 제한)

### 3. 모니터링
- Cloud 모델 사용 시 로그에 `isCloud=true` 표시
- Timeout 발생 시 모델 정보와 함께 로깅

### 4. Fallback 전략
- 모든 에러 상황에서 원문 메시지 반환
- 서버가 죽지 않도록 보장
- 사용자 경험 저하 최소화

## 테스트 시나리오

1. **정상 응답**: 로컬/Cloud 모델 모두 정상 동작 확인
2. **Timeout 발생**: 25-30초 후 fallback 동작 확인
3. **네트워크 에러**: 연결 실패 시 fallback 동작 확인
4. **HTTP 에러**: 4xx/5xx 응답 시 fallback 동작 확인
5. **서버 안정성**: 여러 요청 동시 처리 시 서버 hang 없음 확인

## 추가 개선 사항 (선택)

1. **재시도 로직**: 일시적 네트워크 에러 시 재시도 (현재는 fallback만)
2. **Circuit Breaker**: Cloud 모델 실패율이 높으면 일시적으로 비활성화
3. **모델 자동 감지**: `/api/tags`를 호출하여 사용 가능한 모델 자동 감지
4. **메트릭 수집**: Timeout 발생률, 응답 시간 등 모니터링

