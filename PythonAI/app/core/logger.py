import sys
from loguru import logger
from app.core.config import settings

def setup_logging():
    """
    JSON 포맷의 구조화된 로깅 설정.
    콘솔에는 컬러풀하게, 파일에는 JSON으로 남겨서 추적 용이하게 함.
    """
    logger.remove()  # 기본 핸들러 제거

    # 1. 콘솔 출력 (개발용)
    logger.add(
        sys.stderr,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="DEBUG" if settings.ENV == "dev" else "INFO",
    )

    # 2. 파일 저장 (운영용 - 날짜별로 파일 분리)
    logger.add(
        "logs/app_{time:YYYY-MM-DD}.log",
        rotation="500 MB",  # 500MB 넘으면 새 파일
        retention="10 days", # 10일치 보관
        compression="zip",  # 압축 저장
        level="INFO",
        serialize=True      # JSON 포맷으로 저장 (ELK 스택 연동 유리)
    )

    return logger

app_logger = setup_logging()