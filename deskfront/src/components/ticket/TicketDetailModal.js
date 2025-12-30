import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getTicketDetailByTno } from "../../api/ticketApi";
import { downloadFile } from "../../api/fileApi";
import { useTicketActions } from "../../hooks/useTicketActions";
import { getGradeBadge, getStateLabel, formatDate } from "../../util/ticketUtils";
import FilePreview from "../common/FilePreview";
import useCustomPin from "../../hooks/useCustomPin";

const TicketDetailModal = ({ tno, onClose, onDelete }) => {
  const loginState = useSelector((state) => state.loginSlice);
  const currentEmail = loginState.email;
  const { togglePin, isPinned } = useCustomPin();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isWriter, setIsWriter] = useState(false);
  const [isReceiver, setIsReceiver] = useState(false);

  // TicketDetailModal.js 내부의 useEffect 수정
  useEffect(() => {
    if (!tno || !currentEmail) return;

    const fetchTicket = async () => {
      try {
        setLoading(true);
        const result = await getTicketDetailByTno(tno, currentEmail);

        if (result.ticket && result.ticket.files) {
          const nameMap = {};
          result.ticket.files = result.ticket.files.map((f) => {
            // [체크!] 수신 데이터에 uuid와 fileName이 있는지 확인하기 위한 로그
            // console.log("파일 정보 확인:", f);

            const name = f.fileName || "unknown"; // fileName이 없을 경우 대비

            // 중복 파일명 처리 로직은 유지하되, 원본 객체의 모든 속성(...f)을 반드시 유지해야 함
            let finalDisplayName = name;
            if (!nameMap[name]) {
              nameMap[name] = 1;
              finalDisplayName = name;
            } else {
              const count = nameMap[name]++;
              const dot = name.lastIndexOf(".");
              const b = dot !== -1 ? name.substring(0, dot) : name;
              const e = dot !== -1 ? name.substring(dot) : "";
              finalDisplayName = `${b} (${count})${e}`;
            }

            return {
              ...f, // uuid, image(추가한다면) 등 기존 속성 전체를 그대로 복사
              displayName: finalDisplayName
            };
          });
        }

        setTicket(result.ticket);
        setIsWriter(result.isWriter);
        setIsReceiver(result.isReceiver);
        setLoading(false);
      } catch (err) {
        console.error("티켓 상세 로드 실패:", err);
        alert("조회 실패");
        onClose();
      }
    };
    fetchTicket();
  }, [tno, currentEmail, onClose]);

  const { handleStateChange, handleDelete } = useTicketActions(
    ticket,
    currentEmail,
    isReceiver,
    setTicket,
    onDelete,
    onClose
  );

  const isSentType = isWriter && ticket && ticket.personals !== undefined;
  const isReceivedType = isReceiver && ticket && ticket.pno !== undefined;

  // 다운로드 확인 창 (displayName을 사용하여 사용자에게 안내)
  const handleDownload = (uuid, fileName, displayName) => {
    if (window.confirm(`'${displayName || fileName}' 파일을 다운로드 하시겠습니까?`)) {
      downloadFile(uuid, fileName); // 실제 API 요청은 원본 fileName으로
    }
  };

  if (loading || !ticket)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 text-white font-black">
        로딩 중...
      </div>
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[80%] max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 bg-gray-900 text-white">
          <div className="flex items-center flex-1">
            <button onClick={onClose} className="mr-4 text-white hover:text-gray-300 text-xl font-black transition-all">←</button>
            <h2 className="text-xl font-black italic uppercase tracking-wider text-white flex-1 truncate">{ticket.title}</h2>
            {ticket.grade && <div className="ml-3">{getGradeBadge(ticket.grade)}</div>}
            <button onClick={() => togglePin(ticket.tno)} className={`ml-4 text-2xl transition-all ${isPinned(ticket.tno) ? "text-yellow-500" : "text-gray-300"}`}>
              {isPinned(ticket.tno) ? "★" : "☆"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-100 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-wide">요청 요약</h3>
                <p className="text-gray-800 whitespace-pre-wrap font-medium leading-relaxed">{ticket.content}</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-100 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-wide">첨부 파일 ({ticket.files?.length || 0})</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {ticket.files?.map((file) => (
                    <div
                      key={file.uuid}
                      onClick={() => handleDownload(file.uuid, file.fileName, file.displayName)}
                      className="flex items-center p-3 bg-white rounded-xl border border-gray-200 cursor-pointer hover:bg-blue-50 transition-all"
                    >
                      <div style={{ width: "40px", height: "40px", marginRight: "10px", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
                        <FilePreview file={file} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* [수정 포인트] 가공된 displayName 출력 */}
                        <div className="text-xs font-black truncate" title={file.displayName}>
                          {file.displayName}
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold">
                          {(file.fileSize / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      <span className="text-blue-500 font-black ml-2">↓</span>
                    </div>
                  ))}
                </div>
              </div>

              {isSentType && ticket.personals && (
                <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-100 shadow-sm">
                  <h3 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-wide">수신자 상태</h3>
                  {ticket.personals.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 mb-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                      <span className="font-bold text-gray-700">{p.receiver}</span>
                      <span className="text-xs font-black bg-gray-100 px-3 py-1 rounded-lg">{getStateLabel(p.state)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-1 space-y-6">
              <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-100 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-wide">세부 정보</h3>
                <div className="space-y-4 font-bold text-sm">
                  <div className="flex justify-between"><span>작성자</span><span>{ticket.writer}</span></div>
                  <div className="flex justify-between"><span>생성일</span><span>{formatDate(ticket.birth)}</span></div>
                  <div className="flex justify-between text-red-600"><span>마감일</span><span>{formatDate(ticket.deadline)}</span></div>
                </div>
              </div>

              {isReceivedType && (
                <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-100 shadow-sm">
                  <h3 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-wide">상태 변경</h3>
                  <select
                    value={ticket.state || "NEW"}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl font-bold bg-white focus:border-blue-500 outline-none shadow-sm"
                  >
                    <option value="NEW">{getStateLabel("NEW")}</option>
                    <option value="IN_PROGRESS">{getStateLabel("IN_PROGRESS")}</option>
                    <option value="NEED_INFO">{getStateLabel("NEED_INFO")}</option>
                    <option value="DONE">{getStateLabel("DONE")}</option>
                  </select>
                </div>
              )}
              {isWriter && <button onClick={handleDelete} className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black w-full shadow-lg hover:bg-red-700 transition-all uppercase">삭제</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;