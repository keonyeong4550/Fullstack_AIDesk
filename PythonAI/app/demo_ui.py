import streamlit as st
import requests
import uuid
import time
import jwt # [NEW] JWT 라이브러리
from datetime import datetime, timedelta
from app.core.config import settings # [NEW] Secret Key 설정을 위해 import

# ----------------------------------------------------------------
# [환경 및 API 설정]
# ----------------------------------------------------------------
JAVA_BACKEND_URL = "http://localhost:8080/api/tickets"
PYTHON_API_URL = "http://127.0.0.1:8000/api/v1/chat"
API_KEY = settings.BACKEND_API_KEY
CURRENT_USER_DEPT = "Sales"

st.set_page_config(layout="wide", page_title="AI Work Assistant")

# ----------------------------------------------------------------
# [CSS 스타일링]
# ----------------------------------------------------------------
st.markdown("""
    <style>
        .block-container { padding-top: 1.5rem; padding-bottom: 1rem; }
        h1 { font-size: 1.8rem !important; margin-bottom: 0.5rem; }
        
        /* 성공 메시지 스타일 */
        .success-box {
            padding: 1rem;
            background-color: #e8f4fd;
            border: 1px solid #2196f3;
            border-radius: 8px;
            color: #0d47a1;
            text-align: center;
            font-weight: bold;
            font-size: 1.2rem;
            margin-bottom: 1rem;
        }
        
        .chat-container { height: 600px; overflow-y: auto; }
    </style>
""", unsafe_allow_html=True)

# ----------------------------------------------------------------
# [JWT 토큰 생성 함수] - Java Backend 통신 필수 요소
# ----------------------------------------------------------------
def generate_jwt_token(dept: str):
    """Java Security Filter 통과용 토큰 생성"""
    now = datetime.utcnow()
    payload = {
        "email": "ai_agent@system.com",
        "nickname": "AI_Assistant",
        "social": False,
        "department": dept,
        "approved": True,
        "roleNames": ["USER", "ADMIN"],
        "iat": now,
        "exp": now + timedelta(minutes=10)
    }
    return jwt.encode(payload, settings.JAVA_JWT_SECRET, algorithm="HS256")

# ----------------------------------------------------------------
# [세션 상태 관리]
# ----------------------------------------------------------------
if "conversation_id" not in st.session_state:
    st.session_state.conversation_id = str(uuid.uuid4())
    st.session_state.messages = [
        {"role": "assistant", "content": "안녕하세요. 업무 처리를 도와드릴 AI 비서입니다.\n어떤 업무를 도와드릴까요? (예: '서버가 느려요', '배너 디자인 요청')"}
    ]
    st.session_state.target_dept = None
    st.session_state.is_completed = False
    st.session_state.submit_success = False
    
    st.session_state.current_ticket = {
        "title": "", "content": "", "purpose": "", "requirement": "",
        "grade": "MIDDLE", "deadline": None, "receivers": []
    }

# ----------------------------------------------------------------
# [메인 레이아웃]
# ----------------------------------------------------------------
st.title("🤖 AI 업무 비서")
col_chat, col_ticket = st.columns([6, 4])

# [왼쪽] 채팅창
with col_chat:
    chat_container = st.container(height=600)
    with chat_container:
        for msg in st.session_state.messages:
            with st.chat_message(msg["role"]):
                st.write(msg["content"])

    if prompt := st.chat_input("요청할 업무 내용을 입력하세요...", disabled=st.session_state.submit_success):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with chat_container:
            with st.chat_message("user"):
                st.write(prompt)

        payload = {
            "conversation_id": st.session_state.conversation_id,
            "sender_dept": CURRENT_USER_DEPT,
            "target_dept": st.session_state.target_dept,
            "user_input": prompt,
            "chat_history": st.session_state.messages,
            "current_ticket": st.session_state.current_ticket
        }
        
        try:
            with st.spinner("AI가 분석 중입니다..."):
                response = requests.post(PYTHON_API_URL, json=payload, headers={"x-api-key": API_KEY})
            
            if response.status_code == 200:
                data = response.json()
                st.session_state.current_ticket = data["updated_ticket"]
                st.session_state.is_completed = data["is_completed"]
                st.session_state.target_dept = data.get("identified_target_dept")
                
                ai_msg = data["ai_message"]
                st.session_state.messages.append({"role": "assistant", "content": ai_msg})
                with chat_container:
                    with st.chat_message("assistant"):
                        st.write(ai_msg)
                
                if st.session_state.is_completed:
                    st.rerun()
            else:
                st.error(f"Server Error: {response.text}")
        except Exception as e:
            st.error(f"Connection Failed: {e}")

# [오른쪽] 티켓 패널
with col_ticket:
    c_head1, c_head2 = st.columns([7, 3])
    with c_head1:
        st.info(f"**To: {st.session_state.target_dept or '(미지정)'}**")
    with c_head2:
        if st.button("🔄 초기화", disabled=len(st.session_state.messages) <= 1, use_container_width=True):
            st.session_state.clear()
            st.rerun()

    st.markdown("### 🎫 티켓 미리보기")
    with st.container(border=True, height=520):
        t = st.session_state.current_ticket
        st.text_input("제목", value=t.get("title", ""), disabled=True)
        st.text_area("요약", value=t.get("content", ""), height=80, disabled=True)
        
        r1, r2 = st.columns(2)
        r1.text_area("목적", value=t.get("purpose", ""), height=80, disabled=True)
        r2.text_area("상세", value=t.get("requirement", ""), height=80, disabled=True)
        
        r3, r4 = st.columns(2)
        r3.text_input("마감일", value=t.get("deadline", ""), disabled=True)
        r4.text_input("중요도", value=t.get("grade", ""), disabled=True)
        
        rec = t.get("receivers", [])
        st.text_input("담당자", value=", ".join(rec) if rec else "", disabled=True)

    # [전송 버튼 및 성공 메시지 영역]
    if st.session_state.submit_success:
        st.markdown('<div class="success-box">✅ 티켓 전송이 완료되었습니다.</div>', unsafe_allow_html=True)
        st.button("전송 완료", disabled=True, use_container_width=True)
        
        time.sleep(3)
        st.session_state.clear()
        st.rerun()
        
    elif st.session_state.is_completed:
        if st.button("🚀 업무 티켓 전송", type="primary", use_container_width=True):
            try:
                # [기존 로직 유지] 날짜 포맷 맞추기
                final_deadline = t.get("deadline")
                if final_deadline and len(final_deadline) == 10:
                    final_deadline += " 09:00"
                
                payload = {
                    "title": t.get("title"),
                    "content": t.get("content"),
                    "purpose": t.get("purpose"),
                    "requirement": t.get("requirement"),
                    "grade": t.get("grade"),
                    "deadline": final_deadline,
                    "receivers": t.get("receivers", [])
                }
                
                # [NEW] JWT 헤더 주입 (필수)
                jwt_token = generate_jwt_token(CURRENT_USER_DEPT)
                
                res = requests.post(
                    JAVA_BACKEND_URL, 
                    json=payload, 
                    params={"writer": CURRENT_USER_DEPT},
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {jwt_token}" # 인증 헤더 추가
                    }
                )
                
                if res.status_code in [200, 201]:
                    st.session_state.submit_success = True
                    st.rerun()
                else:
                    st.error(f"전송 실패 (Code: {res.status_code})")
            except Exception as e:
                st.error(f"서버 통신 오류: {e}")