import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { aiSecretaryApi } from "../../api/aiSecretaryApi";
import "./AIChatWidget.css";

const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const AIChatWidget = ({ onClose }) => {
  const loginState = useSelector((state) => state.loginSlice);

  const currentUserDept = loginState.department || "Unknown";
  const currentUserEmail = loginState.email;

  const [conversationId] = useState(generateUUID());
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "안녕하세요. 업무 처리를 도와드릴 AI 비서입니다.\n어떤 업무를 도와드릴까요? (예: '서버가 느려요', '배너 디자인 요청')",
    },
  ]);

  const [currentTicket, setCurrentTicket] = useState({
    title: "",
    content: "",
    purpose: "",
    requirement: "",
    grade: "MIDDLE",
    deadline: "", // 초기값 빈 문자열로 설정 (Controlled Input 경고 방지)
    receivers: [],
  });

  const [targetDept, setTargetDept] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [inputMessage, setInputMessage] = useState("");

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // [NEW] 수동 입력 핸들러 (사용자가 직접 수정 가능하도록)
  const handleManualChange = (e) => {
    const { name, value } = e.target;

    setCurrentTicket((prev) => {
      // 담당자는 배열이므로 쉼표로 구분하여 처리
      if (name === "receivers") {
        return {
          ...prev,
          [name]: value.split(",").map((s) => s.trim()), // 공백 제거하며 배열 저장
        };
      }
      return { ...prev, [name]: value };
    });
  };

  // [NEW] 폼 유효성 검사 (AI 판단과 무관하게 필수 값이 다 차면 true)
  const isFormValid = () => {
    const t = currentTicket;
    // 제목, 요약, 목적, 상세, 마감일, 담당자가 모두 있어야 함
    // (담당자는 빈 배열이 아니고, 첫 번째 요소가 빈 문자열이 아니어야 함)
    const hasReceivers =
      t.receivers && t.receivers.length > 0 && t.receivers[0] !== "";

    return (
      t.title?.trim() &&
      t.content?.trim() &&
      t.purpose?.trim() &&
      t.requirement?.trim() &&
      t.deadline?.trim() &&
      t.grade &&
      hasReceivers
    );
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMsg = { role: "user", content: inputMessage };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const payload = {
        conversation_id: conversationId,
        sender_dept: currentUserDept,
        target_dept: targetDept,
        user_input: userMsg.content,
        chat_history: messages,
        current_ticket: currentTicket,
      };

      const response = await aiSecretaryApi.sendMessage(payload);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.ai_message },
      ]);
      setCurrentTicket(response.updated_ticket);
      setIsCompleted(response.is_completed);

      if (response.identified_target_dept) {
        setTargetDept(response.identified_target_dept);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "죄송합니다. 서버 연결 중 오류가 발생했습니다.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitTicket = async () => {
    // [수정] AI 완료 신호(isCompleted) 또는 수동 폼 유효성(isFormValid) 중 하나라도 만족하면 전송
    if (!isCompleted && !isFormValid()) {
      alert("필수 항목(제목, 내용, 담당자, 마감일 등)을 모두 입력해 주세요.");
      return;
    }

    setIsLoading(true);

    try {
      await aiSecretaryApi.submitTicket(currentTicket, currentUserEmail);
      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      alert("티켓 전송에 실패했습니다. 다시 시도해 주세요.");
      console.error(error);
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("대화 내용을 초기화하시겠습니까?")) {
      setMessages([
        {
          role: "assistant",
          content: "대화가 초기화되었습니다. 다시 말씀해 주세요.",
        },
      ]);
      setCurrentTicket({
        title: "",
        content: "",
        purpose: "",
        requirement: "",
        grade: "MIDDLE",
        deadline: "",
        receivers: [],
      });
      setTargetDept(null);
      setIsCompleted(false);
      setSubmitSuccess(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="ai-widget-overlay">
      <div className="ai-widget-container">
        <div className="ai-widget-header">
          <h2>🤖 AI 업무 비서</h2>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="ai-widget-body">
          <div className="ai-chat-section">
            <div className="chat-messages-area">
              {messages.map((msg, idx) => (
                <div key={idx} className={`chat-message ${msg.role}`}>
                  <div className="chat-avatar">
                    {msg.role === "user" ? "👤" : "🤖"}
                  </div>
                  <div className="chat-bubble">{msg.content}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-wrapper">
              <input
                type="text"
                className="chat-input"
                placeholder="요청할 업무 내용을 입력하세요..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading || submitSuccess}
              />
              <button
                className="reset-btn"
                onClick={handleSendMessage}
                disabled={isLoading || submitSuccess || !inputMessage.trim()}
                style={{
                  backgroundColor: "#ff4b4b",
                  color: "white",
                  border: "none",
                }}
              >
                전송
              </button>
            </div>
          </div>

          {/* --- [우측] 티켓 미리보기 및 수정 영역 --- */}
          <div className="ai-ticket-section">
            <div className="ticket-header-row">
              <span className="dept-badge">To: {targetDept || "(미지정)"}</span>
              <button className="reset-btn" onClick={handleReset}>
                🔄 초기화
              </button>
            </div>

            <div className="ticket-preview-box">
              <div className="form-group">
                <label>
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  className="st-input"
                  value={currentTicket.title || ""}
                  onChange={handleManualChange}
                  placeholder="제목을 입력하세요"
                />
              </div>

              <div className="form-group">
                <label>
                  요약 <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="content"
                  className="st-textarea"
                  rows="3"
                  value={currentTicket.content || ""}
                  onChange={handleManualChange}
                  placeholder="업무 요약을 입력하세요"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    목적 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="purpose"
                    className="st-textarea"
                    rows="2"
                    value={currentTicket.purpose || ""}
                    onChange={handleManualChange}
                    placeholder="배경 및 목적"
                  />
                </div>
                <div className="form-group">
                  <label>
                    상세 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="requirement"
                    className="st-textarea"
                    rows="2"
                    value={currentTicket.requirement || ""}
                    onChange={handleManualChange}
                    placeholder="상세 요구사항"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    마감일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="deadline"
                    type="date"
                    className="st-input"
                    value={currentTicket.deadline || ""}
                    onChange={handleManualChange}
                  />
                </div>
                <div className="form-group">
                  <label>중요도</label>
                  <select
                    name="grade"
                    className="st-input"
                    value={currentTicket.grade}
                    onChange={handleManualChange}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MIDDLE">MIDDLE</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>
                  담당자 (이메일, 콤마로 구분){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  name="receivers"
                  className="st-input"
                  // 배열을 콤마 문자열로 변환하여 표시
                  value={currentTicket.receivers.join(",")}
                  onChange={handleManualChange}
                  placeholder="user1@example.com, user2@example.com"
                />
              </div>
            </div>

            {/* --- 전송 버튼 영역 --- */}
            {submitSuccess ? (
              <div className="success-box">✅ 티켓 전송이 완료되었습니다.</div>
            ) : (
              // AI 완료 신호(isCompleted)가 있거나, 수동 입력 폼이 유효하면(isFormValid) 버튼 표시
              (isCompleted || isFormValid()) && (
                <button
                  className="submit-btn"
                  onClick={handleSubmitTicket}
                  disabled={isLoading}
                >
                  {isLoading ? "전송 중..." : "🚀 업무 티켓 전송"}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatWidget;
