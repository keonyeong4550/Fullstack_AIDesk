

## 플로우 차트
![Image](https://github.com/user-attachments/assets/c8e2d90c-0ad8-458b-82ac-5f125971f726)

<br>
<br>

## 🚀 회의록 자동변환 주요 코드
### (1)
<img width="809" height="534" alt="Image" src="https://github.com/user-attachments/assets/95ccc327-4a16-4abf-818f-d9a2ecc04a76" />


### (2)
<img width="578" height="283" alt="Image" src="https://github.com/user-attachments/assets/b128c7a4-7c55-484d-b66b-f220bceaa8ca" />

## 🚀 불용어 제거 주요 코드
### (1) 불용어 제거 함수 불러오기
<img width="981" height="569" alt="Image" src="https://github.com/user-attachments/assets/98c3a806-8568-4258-9051-2e615636c6d6" />

### (2) 불용어 정규화식 txt 불러오기
<img width="917" height="710" alt="Image" src="https://github.com/user-attachments/assets/9e627a4a-0788-4779-babf-6dc13945b7a8" />

### (3) 불용어 관련 List 불러오기
<img width="1025" height="789" alt="Image" src="https://github.com/user-attachments/assets/590cfdbd-4cc1-4c29-a84a-02fb935501b2" />

### (4) 불용어 제거하기
<img width="821" height="476" alt="Image" src="https://github.com/user-attachments/assets/7d2195bd-0758-45ea-9d33-25e6ee9384c9" />

---

<br>

# 🛠️ 트러블 슈팅

## 1️⃣ STT 변환 및 요약 시간 지연에 따른 UX 저하

#### 문제 현상
50MB에 달하는 긴 회의 음성 파일을 처리할 때, 서버에서 AI 변환 및 요약 작업을 수행하는 동안 프론트엔드에서 응답이 없어 사용자가 멈춘 것으로 오인하거나 이탈하는 문제가 발생했습니다.

#### 원인 분석
STT(Speech-to-Text) 및 LLM 요약 과정은 연산 비용이 높고 시간이 오래 걸리는 작업입니다.
동기적 처리 방식이나 단순한 로딩 아이콘만으로는 사용자에게 충분한 피드백을 주지 못했습니다.

#### 해결 방법
Loading State 관리 고도화: 작업 진행 상태를 명확히 안내하는 UI를 구현했습니다.
서버 설정 최적화: 50MB 이상의 대용량 파일 업로드가 가능하도록 서버의 Multipart 설정을 튜닝하고 타임아웃 설정을 연장했습니다.

#### 결과
사용자는 작업이 진행 중임을 명확히 인지하게 되었고, 대용량 파일 처리 시에도 안정적인 UX를 제공하게 되었습니다.

## 2️⃣ PDF 내 개인정보(이메일) 노출 문제

#### 문제 현상
초기 구현 시 MP3 파일 내 메타데이터나 STT 결과에 포함된 담당자 식별자가 '이메일' 형태로 그대로 PDF에 출력되어 가독성이 떨어지고 딱딱한 느낌을 주었습니다.

#### 해결 방법
매핑 로직 추가: PDF 생성 직전 단계에서 Java 백엔드가 DB의 사용자 정보를 조회하여, 이메일 주소를 **'이름(닉네임)'**으로 변환하는 전처리 로직을 추가했습니다.

#### 결과
회의록의 가독성이 높아지고, 누가 발언했는지 직관적으로 파악할 수 있는 문서가 생성되었습니다.

## 3️⃣ 무의미한 추임새로 인한 요약 품질 저하

#### 문제 현상
회의 녹음 특성상 "음...", "그...", "저기..." 같은 추임새나 "네", "알겠습니다" 같은 단순 호응이 너무 많아 AI 요약 모델이 핵심을 파악하는 데 방해가 되었습니다.


