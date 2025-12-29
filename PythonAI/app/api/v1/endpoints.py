from fastapi import APIRouter, Depends, HTTPException
from app.models.dtos import MediationRequest, MediationResponse
from app.services.agent_core import agent_core
from app.api.dependencies import verify_api_key
from app.core.logger import app_logger
import time

router = APIRouter()

@router.get("/health", status_code=200)
async def health_check():
    """
    Liveness Probe (Kubernetes/Docker Health Check용)
    """
    return {"status": "ok", "service": "AI-Work-Bridge-Enterprise", "version": "2.0.0"}

@router.post(
    "/chat", 
    response_model=MediationResponse,
    dependencies=[Depends(verify_api_key)]
)
async def chat_endpoint(request: MediationRequest):
    """
    [핵심 API] AI 업무 중재 및 티켓 생성
    
    1. UI/Backend에서 대화 내역과 현재 티켓 상태를 전송
    2. AI가 라우팅(부서 찾기) 또는 인터뷰(내용 채우기) 수행
    3. 업데이트된 티켓과 응답 메시지 반환
    """
    start_time = time.time()
    
    # 로깅: 요청 들어온 부서 정보 확인
    app_logger.info(f"Incoming Request | ConvID: {request.conversation_id} | Target: {request.target_dept}")

    try:
        # Agent Core 비즈니스 로직 수행
        response = await agent_core.process_request(request)
        
        elapsed = time.time() - start_time
        app_logger.info(f"Request processed in {elapsed:.2f}s | Completed: {response.is_completed}")
        
        return response
        
    except Exception as e:
        # 프로덕션 레벨에서는 스택 트레이스를 숨기고 에러 ID만 리턴하는 것이 보안상 좋음
        # 여기서는 디버깅을 위해 로그에만 남김
        app_logger.critical(f"Unhandled Exception: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error processing AI request")

