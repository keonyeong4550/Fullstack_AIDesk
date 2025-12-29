import os
from langchain_community.vectorstores import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.core.config import settings
from app.core.logger import app_logger

class VectorStoreManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(VectorStoreManager, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """
        벡터 DB 초기화.
        실제 운영 환경에서는 Pinecone이나 Weaviate 같은 클라우드 DB 사용을 권장하나,
        여기서는 로컬 파일 기반의 ChromaDB로 구현 (데이터 영속성 보장).
        """
        app_logger.info("Initializing Vector Store (ChromaDB)...")
        
        self.embedding_function = GoogleGenerativeAIEmbeddings(
            google_api_key=settings.GOOGLE_API_KEY,
            model="models/embedding-001" # 가성비와 성능이 좋은 최신 임베딩 모델
        )
        
        # 데이터가 저장될 경로가 없으면 생성
        os.makedirs(settings.CHROMA_PERSIST_DIRECTORY, exist_ok=True)

        self.db = Chroma(
            persist_directory=settings.CHROMA_PERSIST_DIRECTORY,
            embedding_function=self.embedding_function
        )
        app_logger.info("Vector Store initialized successfully.")

    def get_retriever(self, k: int = 3):
        """
        검색기(Retriever) 반환
        k: 검색할 문서의 개수
        """
        return self.db.as_retriever(search_kwargs={"k": k})

    def add_documents(self, documents):
        """문서 추가 (관리자 기능용)"""
        self.db.add_documents(documents)
        self.db.persist()

# 전역 인스턴스
vector_store = VectorStoreManager()
