import os
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from app.core.config import settings
from app.core.logger import app_logger

class RDBManager:
    """
    MariaDB (MySQL) 연결 및 쿼리 수행을 위한 싱글톤 매니저
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RDBManager, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """
        SQLAlchemy Engine 초기화
        설정 파일(config.py)에서 주입된 접속 정보를 그대로 사용합니다.
        """
        try:
            # [수정] settings에서 관리되는 URL 사용 (코드 내 하드코딩 제거)
            db_url = settings.SQLALCHEMY_DATABASE_URI
            
            # 엔진 생성 및 커넥션 풀 설정
            self.engine = create_engine(
                db_url,
                pool_size=10,
                max_overflow=20,
                pool_recycle=3600,
                pool_pre_ping=True,
                echo=False
            )
            
            # 초기화 시 즉시 연결 테스트
            with self.engine.connect() as conn:
                app_logger.info(f"✅ RDB Connection Success: {settings.DB_HOST}/{settings.DB_NAME}")
                
        except Exception as e:
            app_logger.critical(f"❌ RDB Connection Failed: {str(e)}")
            self.engine = None

    def find_email_by_name(self, name: str) -> str | None:
        """
        [개인 조회] 닉네임(이름)으로 이메일(ID) 조회
        """
        if not self.engine:
            app_logger.error("DB Engine is not initialized.")
            return None
        
        clean_name = name.strip()
        
        query = text("""
            SELECT email 
            FROM member 
            WHERE nickname = :name 
            AND is_deleted = 0 
            AND is_approved = 1
            LIMIT 1
        """)
        
        try:
            with self.engine.connect() as conn:
                result = conn.execute(query, {"name": clean_name}).fetchone()
                
                if result:
                    email = result[0]
                    app_logger.info(f"🔍 DB Search: '{clean_name}' -> '{email}'")
                    return email
                else:
                    app_logger.warning(f"🔍 DB Search: '{clean_name}' -> Not Found")
                    return None
                    
        except SQLAlchemyError as e:
            app_logger.error(f"DB Query Error (find_email_by_name): {str(e)}")
            return None

    def find_emails_by_department(self, dept_name: str) -> list[str]:
        """
        [부서 전체 조회] 부서명으로 해당 부서원 전체 이메일 리스트 조회
        """
        if not self.engine:
            app_logger.error("DB Engine is not initialized.")
            return []
        
        target_dept = dept_name.upper().strip()
        
        query = text("""
            SELECT email 
            FROM member 
            WHERE department = :dept 
            AND is_deleted = 0 
            AND is_approved = 1
        """)
        
        try:
            with self.engine.connect() as conn:
                results = conn.execute(query, {"dept": target_dept}).fetchall()
                
                email_list = [row[0] for row in results]
                
                app_logger.info(f"🔍 Dept Search: '{target_dept}' -> {len(email_list)} members found.")
                return email_list
                
        except SQLAlchemyError as e:
            app_logger.error(f"DB Query Error (find_emails_by_department): {str(e)}")
            return []

    def test_connection(self):
        """
        [디버깅용] 연결 테스트
        """
        print("--- DB Connection Test ---")
        if not self.engine:
            print("❌ Engine not initialized.")
            return

        # 테스트용 데이터 (SQL에 있는 데이터로 검증)
        test_name = "김민수" 
        print(f"Searching for: {test_name}...")
        result = self.find_email_by_name(test_name)
        if result:
            print(f"✅ 결과 확인: {result}")
        else:
            print("❌ 결과 없음 (또는 DB 연결 실패)")

# 전역 싱글톤 인스턴스
rdb = RDBManager()

if __name__ == "__main__":
    rdb.test_connection()