import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { aiSecretaryApi } from "../../api/aiSecretaryApi";
import FilePreview from "../common/FilePreview";
import "./AIChatWidget.css";

// PDF 관련 라이브러리 import

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
  const [aiSummary, setAiSummary] = useState("");
  const [conversationId] = useState(generateUUID());
  const [messages, setMessages] = useState([
    { role: "assistant", content: "안녕하세요. 어떤 업무를 도와드릴까요?" },
  ]);

  const [currentTicket, setCurrentTicket] = useState({
    title: "",
    content: "",
    purpose: "",
    requirement: "",
    grade: "MIDDLE",
    deadline: "",
    receivers: [],
  });

  const [selectedFiles, setSelectedFiles] = useState([]);

  // Ref 정의
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pdfRef = useRef(null); // ✅ PDF 캡처 영역 참조용 Ref

  const [targetDept, setTargetDept] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [inputMessage, setInputMessage] = useState("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleManualChange = (e) => {
    const { name, value } = e.target;
    setCurrentTicket((prev) => {
      if (name === "receivers")
        return { ...prev, [name]: value.split(",").map((s) => s.trim()) };
      return { ...prev, [name]: value };
    });
  };

  const handleFileChange = async (e) => {
    // async 키워드 추가
    const files = Array.from(e.target.files);

    // 오디오 파일과 일반 파일 분리
    const audioFiles = files.filter((file) => file.type.startsWith("audio/"));
    const otherFiles = files.filter((file) => !file.type.startsWith("audio/"));

    // 1. 일반 파일(PDF, 이미지 등)은 기존 로직대로 첨부 파일 목록에 추가
    if (otherFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...otherFiles]);
    }

    // 2. 오디오 파일이 있다면 즉시 텍스트 변환 시도
    if (audioFiles.length > 0) {
      const audioFile = audioFiles[0]; // 첫 번째 오디오 파일만 처리

      if (
        !window.confirm(
          `'${audioFile.name}' 오디오 파일을 분석하여 텍스트로 변환하시겠습니까?`
        )
      ) {
        return;
      }

      setIsLoading(true);
      setAiSummary("🎤 오디오 내용을 분석하여 텍스트로 변환 중입니다...");

      try {
        // Python API 호출 (aiSecretaryApi에 이미 정의된 함수 사용)
        // conversationId는 기존 state 값 사용
        const response = await aiSecretaryApi.analyzeMeetingAudio(
          audioFile,
          conversationId
        );

        // 가정: Python 서버가 { "transcription": "변환된 텍스트..." } 형태의 JSON을 반환한다고 가정
        // 실제 Python 응답 키값에 맞춰 수정 필요 (예: response.text, response.result 등)
        const transcription =
          response.transcription || response.text || response.message;

        if (transcription) {
          setCurrentTicket((prev) => ({
            ...prev,
            // 기존 내용이 있다면 줄바꿈 후 이어쓰기
            content: prev.content
              ? `${prev.content}\n\n[오디오 녹취록]:\n${transcription}`
              : transcription,
          }));
          setAiSummary(
            "✅ 오디오 변환이 완료되었습니다. 내용을 확인하고 '요약' 버튼을 눌러주세요."
          );
        } else {
          setAiSummary("⚠️ 오디오 변환 결과가 비어있습니다.");
        }
      } catch (error) {
        console.error("Audio STT Error:", error);
        setAiSummary("❌ 오디오 분석 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
        // 오디오 파일은 input에서 초기화 (Java 서버로 전송할 필요 없으므로 selectedFiles에 넣지 않음)
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };
  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isFormValid = () => {
    const t = currentTicket;
    const hasReceivers =
      t.receivers && t.receivers.length > 0 && t.receivers[0] !== "";
    return t.title?.trim() && t.content?.trim() && hasReceivers && t.deadline;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    const userMsg = { role: "user", content: inputMessage };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);
    try {
      const response = await aiSecretaryApi.sendMessage({
        conversation_id: conversationId,
        sender_dept: currentUserDept,
        target_dept: targetDept,
        user_input: userMsg.content,
        chat_history: messages,
        current_ticket: currentTicket,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.ai_message },
      ]);
      setCurrentTicket(response.updated_ticket);
      setIsCompleted(response.is_completed);
      if (response.identified_target_dept)
        setTargetDept(response.identified_target_dept);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "AI 서버 오류가 발생했습니다." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitTicket = async () => {
    console.log("전송 버튼 클릭됨");
    if (!isFormValid()) {
      alert("필수 항목(제목, 내용, 담당자, 마감일)을 모두 확인해 주세요.");
      return;
    }
    setIsLoading(true);
    try {
      await aiSecretaryApi.submitTicket(
        currentTicket,
        selectedFiles,
        currentUserEmail
      );
      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      alert("티켓 전송에 실패했습니다.");
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("초기화하시겠습니까?")) {
      setMessages([{ role: "assistant", content: "대화가 초기화되었습니다." }]);
      setCurrentTicket({
        title: "",
        content: "",
        purpose: "",
        requirement: "",
        grade: "MIDDLE",
        deadline: "",
        receivers: [],
      });
      setSelectedFiles([]);
      setTargetDept(null);
      setIsCompleted(false);
      setSubmitSuccess(false);
    }
  };

  const openPreviewAndDownloadPdf = (arrayBuffer, fileName = "report.pdf") => {
    // ✅ ArrayBuffer → Uint8Array로 감싸야 브라우저 호환이 안정적이에요
    const bytes = new Uint8Array(arrayBuffer);

    // ✅ PDF 시그니처 검사 (%PDF-)
    const sig = String.fromCharCode(...bytes.slice(0, 5));
    if (sig !== "%PDF-") {
      // PDF가 아닌데 PDF로 열려고 해서 "로드 못함"이 뜨는 케이스를 차단
      const text = new TextDecoder("utf-8").decode(bytes);
      throw new Error(text || "서버가 PDF가 아닌 데이터를 반환했습니다.");
    }

    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    // 1) ✅ 미리보기 (새 탭)
    window.open(url, "_blank", "noopener,noreferrer");

    // 2) ✅ 다운로드
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    // 미리보기 탭에서도 써야 하므로 너무 빨리 revoke하면 안 열릴 수 있어요.
    // 30초 후 정리(필요하면 늘려요)
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  // ✅ 길이 제한 요약 (문장/단락용)
  const compressText = (text = "", max = 240) => {
    const t = String(text || "")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!t) return "";
    if (t.length <= max) return t;

    // 문장 단위로 잘라보기
    const sentences = t.split(/(?<=[.!?。]|다\.)\s+/);
    let out = "";
    for (const s of sentences) {
      if ((out + (out ? " " : "") + s).length > max) break;
      out += (out ? " " : "") + s;
    }
    if (out) return out;

    // fallback: 강제 컷
    return t.slice(0, max - 1) + "…";
  };

  // ✅ 리스트/번호항목 요약 (상세 논의 사항용)
  const compressList = (text = "", maxLines = 4, maxChars = 420) => {
    const t = String(text || "")
      .replace(/\r/g, "")
      .trim();
    if (!t) return "";

    // 번호/불릿 라인 우선 추출
    const lines = t
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const bulletLike = lines.filter((l) =>
      /^(\d+\.|[-*•]|[가-힣]\.)\s*/.test(l)
    );
    const picked = (bulletLike.length ? bulletLike : lines).slice(0, maxLines);

    let out = picked.join("\n");
    if (out.length > maxChars) out = out.slice(0, maxChars - 1) + "…";
    return out;
  };

  // ✅ 파란창(aiSummary)을 인풋용으로 재구성
  const buildInputFromSummary = (s) => {
    const title = compressText(s?.title || "", 60);

    // "요약" 필드(content)는: 개요 + 결론을 짧게 합친 1~2단락
    const content = [
      compressText(s?.overview || s?.shortSummary || "", 220),
      s?.conclusion ? `결론: ${compressText(s.conclusion, 140)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    // 목적(purpose)은 개요를 더 짧게
    const purpose = compressText(s?.overview || "", 120);

    // 상세(requirement)는 리스트/핵심 항목 위주로
    const requirement = compressList(s?.details || "", 5, 520);

    // 담당자 1명만
    let singleReceiver = "";
    if (Array.isArray(s?.attendees) && s.attendees.length > 0)
      singleReceiver = s.attendees[0];
    else if (typeof s?.attendees === "string")
      singleReceiver = s.attendees.split(",")[0].trim();

    return { title, content, purpose, requirement, singleReceiver };
  };
  const handleAiSummary = async () => {
    // 유효성 검사 (파일이나 내용이 있는지 확인 - 기존 유지)
    const hasContent = currentTicket.title || currentTicket.content;
    const hasFile = selectedFiles.length > 0;
    if (!hasContent && !hasFile) {
      // (필요하다면 alert 유지, 아니면 생략)
    }

    setIsLoading(true);
    // 로딩 중에는 텍스트로 안내
    setAiSummary("⏳ 내용을 분석하여 회의록을 작성 중입니다...");

    try {
      const fileToSend = selectedFiles.length > 0 ? selectedFiles[0] : null;
      const data = await aiSecretaryApi.getSummary(currentTicket, fileToSend);

      // -------------------------------------------------------------
      // [수정 1] 파란 박스에 문자열 대신 '데이터 객체' 자체를 저장
      // (화면에서 표로 그리기 위함)
      // -------------------------------------------------------------
      setAiSummary(data);

      // -------------------------------------------------------------
      // [수정 2] Input 창 채우기 (담당자 1명만 선택)
      // -------------------------------------------------------------

      // 담당자: 배열이면 첫 번째 사람만, 문자열이면 콤마로 잘라서 첫 번째만

      // 파란창은 원본 그대로

      // ✅ 여기서 singleReceiver까지 같이 받는다
      const { title, content, purpose, requirement, singleReceiver } =
        buildInputFromSummary(data);

      // ❌ singleReceiver를 여기서 다시 만들지 말 것

      setCurrentTicket((prev) => ({
        ...prev,
        title: title || prev.title,
        content: content || prev.content,
        purpose: purpose || prev.purpose,
        requirement: requirement || prev.requirement,
        deadline:
          data.deadline && data.deadline.length >= 10
            ? data.deadline
            : prev.deadline,
        receivers: singleReceiver ? [singleReceiver] : prev.receivers,
      }));
    } catch (error) {
      console.error(error);
      setAiSummary("오류가 발생했습니다."); // 에러 시엔 문자열 저장
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsLoading(true);
    try {
      let res;

      // ✅ 파란창 요약이 객체면: 그대로 PDF
      if (aiSummary && typeof aiSummary === "object") {
        res = await aiSecretaryApi.downloadSummaryPdf(aiSummary);
      } else {
        // 🔁 fallback: 기존 로직 유지 (원하면 삭제 가능)
        const fileToSend = selectedFiles.length > 0 ? selectedFiles[0] : null;
        const raw = await aiSecretaryApi.downloadPdf(currentTicket, fileToSend);
        // downloadPdf가 data만 줄 수도 있어서 형태 통일
        res = {
          status: 200,
          headers: { "content-type": "application/pdf" },
          data: raw,
        };
      }

      const ct = res.headers?.["content-type"] || "";
      if (res.status !== 200 || !ct.includes("application/pdf")) {
        const text = new TextDecoder("utf-8").decode(res.data);
        throw new Error(text);
      }

      const blob = new Blob([new Uint8Array(res.data)], {
        type: "application/pdf",
      });
      // 콜솔 로그
      console.log("status:", res.status);
      console.log("content-type:", res.headers?.["content-type"]);

      const head = new TextDecoder("utf-8").decode(
        new Uint8Array(res.data).slice(0, 300)
      );
      console.log("body head:", head);
      const bytes = new Uint8Array(res.data);
      console.log("byteLength:", bytes.length);
      console.log("sig5:", String.fromCharCode(...bytes.slice(0, 5)));
      // 콜솔 로그
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      const fileName = `${
        aiSummary?.title || currentTicket.title || "회의록"
      }_AI_Report.pdf`;

      // ✅ 미리보기 + 다운로드 + 유효성 검사까지 한 번에
      openPreviewAndDownloadPdf(res.data, fileName);

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.message || "PDF 다운로드에 실패했어요.");
    } finally {
      setIsLoading(false);
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
              <button
                type="button"
                style={{ marginRight: "10px", fontSize: "20px" }}
                onClick={() => fileInputRef.current.click()}
              >
                📎
              </button>
              <input
                type="file"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />

              <input
                type="text"
                className="chat-input"
                placeholder="업무 요청 내용을 입력하세요..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleSendMessage()
                }
              />
              <button
                className="reset-btn"
                onClick={handleSendMessage}
                disabled={isLoading || submitSuccess || !inputMessage.trim()}
              >
                전송
              </button>
            </div>
          </div>

          <div className="ai-ticket-section">
            <div
              className="ticket-header-row"
              style={{ display: "flex", gap: "8px", alignItems: "center" }}
            >
              <span className="dept-badge" style={{ marginRight: "auto" }}>
                To: {targetDept || "(미지정)"}
              </span>

              {/* ✅ [1. AI 요약 버튼] */}
              <button
                type="button"
                onClick={handleAiSummary}
                style={{
                  background: "#6366f1", // 인디고 색상
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                disabled={isLoading}
              >
                <span>✨</span> 요약
              </button>

              {/* ✅ [2. PDF 다운로드 버튼] */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                style={{
                  background: "#ef4444", // 기존 빨간색 유지
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                📄 PDF
              </button>

              <button className="reset-btn" onClick={handleReset}>
                🔄
              </button>
            </div>

            {/* 내용 영역 */}
            <div className="ticket-preview-box" ref={pdfRef}>
              {/* AI 요약 결과 (값 있으면 자동 표시) */}
              {aiSummary && (
                <div
                  style={{
                    border: "2px solid #6366f1",
                    padding: "15px",
                    marginBottom: "20px",
                    backgroundColor: "#f5f3ff",
                    borderRadius: "8px",
                  }}
                >
                  <div className="summary-title">
                    <span>🤖</span> AI 요약 리포트
                  </div>

                  {/* 1. 로딩 중이거나 에러 메시지(문자열)일 때 */}
                  {typeof aiSummary === "string" ? (
                    <p style={{ margin: 0, color: "#374151" }}>{aiSummary}</p>
                  ) : (
                    /* 2. 데이터가 다 와서 객체(Object)일 때 -> 표로 보여주기 */
                    <table className="summary-table">
                      <tbody>
                        <tr>
                          <th>회의 제목</th>
                          <td>{aiSummary.title || "-"}</td>
                        </tr>
                        <tr>
                          <th>참석자</th>
                          <td>
                            {Array.isArray(aiSummary.attendees)
                              ? aiSummary.attendees.join(", ")
                              : aiSummary.attendees || "-"}
                          </td>
                        </tr>
                        <tr>
                          <th>회의 개요 및 목적</th>
                          <td>{aiSummary.overview || "-"}</td>
                        </tr>
                        <tr>
                          <th>상세 논의 사항</th>
                          <td>{aiSummary.details || "-"}</td>
                        </tr>
                        <tr>
                          <th>결론 및 향후 계획</th>
                          <td>{aiSummary.conclusion || "-"}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  className="st-input"
                  value={currentTicket.title || ""}
                  onChange={handleManualChange}
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
                  담당자 <span className="text-red-500">*</span>
                </label>
                <input
                  name="receivers"
                  className="st-input"
                  value={currentTicket.receivers.join(",")}
                  onChange={handleManualChange}
                />
              </div>

              {/* [파일 미리보기 영역] */}
              {selectedFiles.length > 0 && (
                <div className="form-group">
                  <label>첨부 파일 ({selectedFiles.length})</label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, 1fr)",
                      gap: "5px",
                      marginTop: "10px",
                    }}
                  >
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: "relative",
                          aspectRatio: "1/1",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          overflow: "hidden",
                        }}
                      >
                        <FilePreview file={file} isLocal={true} />
                        {/* data-html2canvas-ignore 속성을 쓰면 캡처시 X버튼은 안 보이게 할 수도 있습니다. */}
                        <button
                          onClick={() => removeFile(idx)}
                          style={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            background: "rgba(0,0,0,0.5)",
                            color: "white",
                            border: "none",
                            cursor: "pointer",
                            width: "20px",
                          }}
                          data-html2canvas-ignore="true"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {submitSuccess ? (
              <div className="success-box">✅ 티켓 전송 완료</div>
            ) : (
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
