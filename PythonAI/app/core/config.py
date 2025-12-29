import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # 기본 앱 설정
    PROJECT_NAME: str = "AI Work Mediator"
    API_V1_STR: str = "/api/v1"
    ENV: str = Field("dev", pattern="^(dev|prod|test)$")
    
    # OpenAI/Gemini 설정
    GOOGLE_API_KEY: str = Field(..., description="Gemini API Key")
    GEMINI_MODEL_NAME: str = "gemini-2.5-pro"
    GEMINI_TEMPERATURE: float = 0.0

    # Vector DB 설정
    CHROMA_PERSIST_DIRECTORY: str = "./data/chroma_db"
    
    # 보안
    BACKEND_API_KEY: str = Field(..., description="API Secret Key")
    JAVA_JWT_SECRET: str = "1234567890123456789012345678901234567890"

    # [NEW] Database 설정 (External Configuration)
    # 기본값은 Docker 환경을 가정
    DB_HOST: str = "host.docker.internal"
    DB_PORT: int = 3306
    DB_NAME: str = "aisdb"
    DB_USER: str = "aisdbuser"
    DB_PASSWORD: str = "aisdbuser"

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        """DB 접속 URL 조합"""
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore" # 정의되지 않은 환경변수는 무시

# 싱글톤 설정 객체 생성
settings = Settings()