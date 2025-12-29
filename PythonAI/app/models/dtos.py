
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime

# ---------------------------------------------------------
# [Shared Model] 티켓 데이터 (Java Backend TicketCreateDTO와 매핑)
# ---------------------------------------------------------
class TicketSchema(BaseModel):
    # Java: TicketCreateDTO 필드명과 일치화
    title: str = Field("", description="요청 제목")
    content: str = Field("", description="요청 요약 (Summary)")
    purpose: str = Field("", description="배경/목적 (Why)")
    requirement: str = Field("", description="상세 요구사항 (What/How)")
    
    # Java: LocalDateTime (yyyy-MM-dd HH:mm)
    # AI는 날짜(YYYY-MM-DD)만 먼저 추출하고, UI 전송 시점에 시간을 붙여 포맷을 맞춤
    deadline: Optional[str] = Field(None, description="YYYY-MM-DD")
    
    # Java: TicketGrade (LOW, MIDDLE, HIGH, URGENT)
    # AI 기본값은 'MIDDLE'로 설정
    grade: Literal["LOW", "MIDDLE", "HIGH", "URGENT"] = Field("MIDDLE", description="업무 중요도")
    
    # Java: List<String> receivers
    # AI는 기본적으로 1명의 담당자를 찾지만, 확장성을 위해 리스트로 관리
    receivers: List[str] = Field(default_factory=list, description="수신 담당자 리스트")
    
    # 내부 로직용 필드 (Java 전송 시에는 제외됨)
    completion_rate: int = Field(0, ge=0, le=100, description="작성 완료율")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator('deadline', mode='before')
    @classmethod
    def validate_deadline(cls, v):
        if not v:
            return None
        try:
            # AI가 '2025-12-25' 형태로 주면 유효성만 체크
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            return None

    @field_validator('grade', mode='before')
    @classmethod
    def map_priority_to_grade(cls, v):
        # AI가 기존 로직(Normal/Urgent)으로 생각할 경우를 대비한 매핑
        if v in ["S", "A", "Urgent", "High", "긴급"]:
            return "URGENT"
        if v in ["Normal", "Low", "Medium", "B", "C", "보통"]:
            return "MIDDLE"
        # 이미 정확한 Enum 값이 들어온 경우
        if v in ["LOW", "MIDDLE", "HIGH", "URGENT"]:
            return v
        return "MIDDLE"

# ---------------------------------------------------------
# [Request] Java Backend / UI -> AI Service
# ---------------------------------------------------------
class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)

class MediationRequest(BaseModel):
    conversation_id: str = Field(..., description="대화 세션 ID")
    sender_dept: str
    
    # 초기 대화 시에는 수신 부서를 모를 수 있음 (AI가 추론해야 함)
    target_dept: Optional[str] = None 
    
    user_input: str
    chat_history: List[ChatMessage]
    current_ticket: TicketSchema

# ---------------------------------------------------------
# [Response] AI Service -> Java Backend / UI
# ---------------------------------------------------------
class MediationResponse(BaseModel):
    conversation_id: str
    ai_message: str
    
    # AI가 대화를 통해 찾아낸 수신 부서 (없으면 None)
    identified_target_dept: Optional[str] = None
    
    updated_ticket: TicketSchema
    is_completed: bool
    
    # UI 동작 제어용
    next_action: Literal["continue_chat", "suggest_submit"] = "continue_chat"
    
    # UI에 띄워줄 부족한 정보 리스트 (선택적)
    missing_info_list: List[str] = Field(default_factory=list)

