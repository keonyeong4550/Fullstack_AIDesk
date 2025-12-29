from fastapi import Header, HTTPException, status
from app.core.config import settings

async def verify_api_key(x_api_key: str = Header(..., description="Java Backend와의 통신을 위한 Secret Key")):
    """
    HTTP 헤더의 'x-api-key'를 검증합니다.
    """
    if x_api_key != settings.BACKEND_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials"
        )
    return x_api_key