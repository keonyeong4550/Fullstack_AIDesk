
import json
import os
from typing import List, Optional
from langchain.schema import Document
from app.db.vector_store import vector_store
from app.core.logger import app_logger

class RAGService:
    def __init__(self):
        # 검색 정확도를 위해 k=5 유지 (필요 시 config로 뺄 수 있음)
        self.retriever = vector_store.get_retriever(k=5)
        
        # JSON 파일 경로 설정 (프로젝트 루트 기준 data/initial_knowledge.json)
        self.json_path = os.path.join(os.getcwd(), "data", "initial_knowledge.json")
        
        # 데이터 초기화 실행
        self._initialize_knowledge_base()

    def _initialize_knowledge_base(self):
        """
        [Enterprise Level Data Seeding]
        하드코딩된 데이터 대신, 외부 JSON 파일(initial_knowledge.json)을 로드하여
        벡터 DB가 비어있을 경우 초기 데이터를 주입합니다.
        """
        try:
            # 1. DB에 이미 데이터가 있는지 확인 (중복 적재 방지)
            # ChromaDB의 get()은 메타데이터 등을 가져옴. 데이터가 있으면 스킵.
            existing_docs = vector_store.db.get()
            if existing_docs and len(existing_docs['ids']) > 0:
                app_logger.info("Vector Store is already populated. Skipping initialization.")
                return

            # 2. JSON 파일 존재 확인
            if not os.path.exists(self.json_path):
                app_logger.warning(f"Knowledge JSON file not found at: {self.json_path}. Skipping seeding.")
                return

            # 3. JSON 로드 및 Document 객체 변환
            app_logger.info(f"Loading knowledge base from {self.json_path}...")
            
            with open(self.json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            documents = []
            for dept, items in data.items():
                for item in items:
                    # 메타데이터에 부서 정보 포함 (필터링 용도)
                    doc = Document(
                        page_content=item,
                        metadata={"dept": dept}
                    )
                    documents.append(doc)

            # 4. 벡터 DB에 주입
            if documents:
                vector_store.add_documents(documents)
                app_logger.info(f"Successfully seeded {len(documents)} documents into Vector Store.")
            else:
                app_logger.warning("JSON file is empty or invalid format.")

        except json.JSONDecodeError as e:
            app_logger.error(f"Failed to parse Knowledge JSON: {e}")
        except Exception as e:
            app_logger.error(f"RAG Initialization failed: {e}")

    async def get_context(self, target_dept: str, user_input: str = "") -> str:
        """
        [Smart Retrieval]
        사용자의 입력(user_input)을 검색 쿼리에 포함시켜,
        단순 부서 매뉴얼이 아닌 '상황에 맞는 구체적 가이드라인'을 찾아냅니다.
        
        Args:
            target_dept (str): 대상 부서 (예: '인사팀', '개발팀')
            user_input (str): 사용자의 실제 발화 (예: '돈이 안 들어왔어')
        """
        if not target_dept:
            return "부서가 지정되지 않았습니다."

        try:
            # [핵심 개선] 검색 쿼리 고도화
            # 사용자의 구어체("돈이 안 들어왔어")와 키워드("필수 요청양식")를 결합
            # 벡터 DB는 의미론적 유사성을 통해 '돈이 안 들어왔어' <-> '급여 미지급'을 매칭함
            query = f"[{target_dept}] {user_input} 업무 가이드라인 필수 체크리스트 시나리오"
            
            # 비동기 검색 수행
            docs = await self.retriever.ainvoke(query)
            
            if not docs:
                app_logger.warning(f"No documents found for query: {query}")
                return "관련된 상세 가이드라인을 찾지 못했습니다. 육하원칙(5W1H)에 따라 상세히 작성해주세요."
            
            # 검색된 문서들의 내용을 하나의 문자열로 결합
            context_text = "\n\n".join([f"- {doc.page_content}" for doc in docs])
            
            app_logger.debug(f"RAG Context Retrieved for '{user_input}': {len(docs)} docs found.")
            return context_text
            
        except Exception as e:
            app_logger.error(f"RAG Retrieval failed: {e}")
            return "가이드라인 검색 중 시스템 오류 발생."

# 싱글톤 인스턴스 생성
rag_service = RAGService()
