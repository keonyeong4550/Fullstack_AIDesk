from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logger import app_logger
from app.api.v1.endpoints import router as api_v1_router

# 앱 초기화
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise AI Mediator Service for Cross-Department Workflow",
    version="1.0.0",
    docs_url="/docs", # Swagger UI 경로
    redoc_url="/redoc"
)

# CORS 설정 (보안상 Java 서버의 IP만 허용하는 것이 좋으나, 개발 편의를 위해 열어둠)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 운영 환경에서는 Java Backend IP로 제한할 것!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

# 서버 시작/종료 이벤트 핸들러
@app.on_event("startup")
async def startup_event():
    app_logger.info("Starting up AI Bridge Service...")
    # 여기서 DB 연결 확인 등을 수행할 수 있음

@app.on_event("shutdown")
async def shutdown_event():
    app_logger.info("Shutting down AI Bridge Service...")

# 로컬 실행용 (python app/main.py)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
