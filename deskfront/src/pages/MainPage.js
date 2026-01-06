import React, { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import BasicLayout from "../layouts/BasicLayout";
import { getRecentReceivedTickets, getReceivedTickets, getSentTickets } from "../api/ticketApi";
import { getRecentBoards } from "../api/boardApi";
import useCustomPin from "../hooks/useCustomPin";
import TicketDetailModal from "../components/ticket/TicketDetailModal";
import { getGradeBadge } from "../util/ticketUtils";
import AIChatWidget from "../components/menu/AIChatWidget";

const MainPage = () => {
  const loginState = useSelector((state) => state.loginSlice);
  const navigate = useNavigate();
  const { pinItems } = useCustomPin();

  const [recentTasks, setRecentTasks] = useState([]);
  const [recentBoards, setRecentBoards] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingSentCount, setPendingSentCount] = useState(0);

  const [selectedTno, setSelectedTno] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIWidgetOpen, setIsAIWidgetOpen] = useState(false); // 요청서 모달 상태 추가

  const isLoggedIn = !!loginState.email;
  const email = loginState.email;
  const displayName = loginState.nickname || "사용자";

  const getCategoryStyle = (category) => {
    switch (category) {
      case "공지사항": return "ui-badge-category-notice";
      case "가이드": return "ui-badge-category-guide";
      case "FAQ": return "ui-badge-category-faq";
      default: return "ui-badge-category";
    }
  };

  const fetchMainData = useCallback(() => {
    if (!isLoggedIn) {
      setRecentTasks([]);
      setRecentBoards([]);
      setUnreadCount(0);
      setPendingSentCount(0);
      return;
    }

    getRecentBoards().then(data => setRecentBoards(data || [])).catch(() => {});
    getRecentReceivedTickets(email).then(data => setRecentTasks(data || [])).catch(() => setRecentTasks([]));
    getReceivedTickets(email, { size: 1 }, { read: false }).then(res => setUnreadCount(res.totalCount || 0)).catch(() => setUnreadCount(0));
    getSentTickets(email, { size: 1 }, { state: 'IN_PROGRESS' }).then(res => setPendingSentCount(res.totalCount || 0)).catch(() => setPendingSentCount(0));
  }, [isLoggedIn, email]);

  useEffect(() => {
    fetchMainData();
  }, [fetchMainData]);

  const moveToListWithFilter = (tab, read = "ALL", state = "") => {
    if (!isLoggedIn) {
      alert("로그인이 필요한 서비스입니다.");
      navigate("/member/login");
      return;
    }
    const params = new URLSearchParams();
    params.set("tab", tab);
    params.set("read", read);
    if (state) params.set("state", state);
    navigate({ pathname: "/tickets/list", search: `?${params.toString()}` });
  };

  const openDetail = (tno) => {
    setSelectedTno(tno);
    setIsModalOpen(true);
  };

  return (
    <BasicLayout>
      {/* 요청서 모달 추가 */}
      {isAIWidgetOpen && <AIChatWidget onClose={() => setIsAIWidgetOpen(false)} />}

      <div className="bg-slate-50 min-h-screen flex flex-col">
        {/* Hero Section */}
        <section className="relative w-full bg-brandNavy text-white overflow-hidden shadow-xl z-0 h-[650px] md:h-[750px] transition-all">
          {/* Spline 3D Iframe Layer */}
          <div className="absolute inset-0 z-0">
            <iframe 
              src="https://my.spline.design/webdiagram-XeG6Et5RJhyNYmbCHQ9OgYA3/" 
              frameBorder="0" 
              width="100%" 
              height="100%" 
              className="w-full h-full pointer-events-auto" 
              title="3D Background"
            ></iframe>
            
            {/* Overlay Gradient for Readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-brandNavy via-brandNavy/70 to-transparent pointer-events-none"></div>
            
            {/* Dot Pattern Overlay */}
            <div className="absolute inset-0 bg-pattern-grid opacity-10 pointer-events-none"></div>
          </div>

          {/* Content Container */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center pointer-events-none">
            <div className="max-w-3xl pointer-events-auto">
              {isLoggedIn && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/40 border border-blue-400/30 text-blue-100 text-xs font-medium mb-6 backdrop-blur-md animate-pulse-glow shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-brandOrange"></span>
                  AI Workflow Engine Active
                </div>
              )}
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight drop-shadow-sm">
                {isLoggedIn ? (
                  <>
                    안녕하세요, {displayName}님 <br />
                    <span className="text-blue-200">오늘의 업무를 시작해볼까요?</span>
                  </>
                ) : (
                  "로그인이 필요합니다"
                )}
              </h1>
              
              <p className="text-blue-100 text-lg md:text-xl font-light mb-10 max-w-2xl leading-relaxed opacity-90 drop-shadow-sm">
                AI 챗봇과 대화하며 복잡한 업무 요청서를 자동으로 생성하세요. <br />
                {isLoggedIn && (
                  <>
                    오늘 처리해야 할 중요한 업무가 <strong className="text-brandOrange font-semibold border-b border-brandOrange/50 pb-0.5">{pinItems.length}건</strong> 있습니다.
                  </>
                )}
              </p>

              {/* Interactive AI Input Area */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => isLoggedIn ? setIsAIWidgetOpen(true) : navigate("/member/login")}
                  className="group flex items-center justify-center gap-3 bg-white text-brandNavy px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:bg-blue-50 transition-all transform hover:-translate-y-1 ring-1 ring-blue-100"
                >
                  <span className="material-symbols-outlined text-brandOrange group-hover:rotate-12 transition-transform text-2xl">add_circle</span>
                  {isLoggedIn ? "새 업무 요청서 만들기" : "로그인 하러 가기"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Area */}
        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-10 -mt-16 relative z-20">
          {/* Stats Overview Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatusCard
              title="중요 업무 (PIN)"
              count={isLoggedIn ? pinItems.length : 0}
              color="text-brandNavy"
              icon="star"
              onClick={() => isLoggedIn && window.dispatchEvent(new Event('open-pin-drawer'))}
            />
            <StatusCard
              title="읽지 않은 업무"
              count={unreadCount}
              color="text-brandNavy"
              icon="mail"
              onClick={() => moveToListWithFilter('RECEIVED', 'UNREAD')}
              hasBadge={unreadCount > 0}
            />
            <StatusCard
              title="진행 중인 업무"
              count={pendingSentCount}
              color="text-brandNavy"
              icon="pending_actions"
              onClick={() => moveToListWithFilter('ALL', 'ALL', 'IN_PROGRESS')}
            />
          </section>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Recent Tasks */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-brandNavy rounded-full"></div>
                  <h2 className="text-xl font-bold text-slate-800">최근 받은 업무</h2>
                </div>
                <button 
                  onClick={() => moveToListWithFilter('RECEIVED')}
                  className="text-xs font-semibold text-slate-500 hover:text-brandNavy transition-colors flex items-center bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg"
                >
                  전체보기 <span className="material-symbols-outlined text-sm ml-0.5">chevron_right</span>
                </button>
              </div>
              <div className="p-3 flex-1">
                {!isLoggedIn ? (
                  <div className="flex flex-col items-center justify-center h-full py-14">
                    <p className="text-slate-500 font-medium mb-4">로그인 후 이용 가능합니다.</p>
                  </div>
                ) : recentTasks.length > 0 ? (
                  recentTasks.map((task, index) => (
                    <div 
                      key={task.tno} 
                      onClick={() => openDetail(task.tno)} 
                      className="group relative flex items-center gap-5 p-5 hover:bg-slate-50 rounded-xl transition-all cursor-pointer border-b border-slate-50 last:border-0 mb-1"
                    >
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-brandOrange rounded-r opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-base font-bold text-slate-800 truncate group-hover:text-brandNavy transition-colors">{task.title}</span>
                          {index === 0 && unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-brandOrange border border-orange-200 uppercase tracking-wide">New</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-slate-400">schedule</span> 
                            {task.birth}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-slate-400">account_circle</span> 
                            {task.writer}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">{getGradeBadge(task.grade)}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 flex flex-col items-center justify-center h-28 text-slate-300 border-2 border-dashed border-slate-100 rounded-xl m-2 bg-slate-50/50">
                    <span className="material-symbols-outlined mb-1">check_circle</span>
                    <span className="text-xs font-medium">받은 업무가 없습니다</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Notices */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-brandNavy rounded-full"></div>
                  <h2 className="text-xl font-bold text-slate-800">최근 공지</h2>
                </div>
                <button 
                  onClick={() => navigate("/board/list")}
                  className="text-xs font-semibold text-slate-500 hover:text-brandNavy transition-colors flex items-center bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg"
                >
                  전체보기 <span className="material-symbols-outlined text-sm ml-0.5">chevron_right</span>
                </button>
              </div>
              <div className="p-3 flex-1">
                {!isLoggedIn ? (
                  <div className="flex flex-col items-center justify-center h-full py-14">
                    <p className="text-slate-500 font-medium mb-4">로그인 후 이용 가능합니다.</p>
                  </div>
                ) : recentBoards.length > 0 ? (
                  recentBoards.map((board) => (
                    <div 
                      key={board.bno} 
                      onClick={() => navigate(`/board/read/${board.bno}`)} 
                      className="group flex items-start gap-4 p-5 hover:bg-slate-50 rounded-xl transition-all cursor-pointer border-b border-slate-50 last:border-0 mb-1"
                    >
                      <div className={`mt-0.5 min-w-[40px] h-[40px] rounded-full flex items-center justify-center border group-hover:scale-110 transition-transform ${
                        board.category === '공지사항' ? 'bg-red-50 text-red-500 border-red-100' :
                        board.category === '가이드' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        board.category === 'FAQ' ? 'bg-green-50 text-green-600 border-green-100' :
                        'bg-slate-50 text-slate-600 border-slate-100'
                      }`}>
                        <span className="material-symbols-outlined text-[20px]">
                          {board.category === '공지사항' ? 'campaign' : 
                           board.category === '가이드' ? 'menu_book' :
                           board.category === 'FAQ' ? 'help' : 'info'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-sm font-bold text-slate-700 group-hover:text-brandNavy transition-colors leading-snug">{board.title}</h3>
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                            board.category === '공지사항' ? 'bg-red-100 text-red-600' :
                            board.category === '가이드' ? 'bg-blue-100 text-blue-600' :
                            board.category === 'FAQ' ? 'bg-green-100 text-green-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {board.category || "일반"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1 leading-relaxed">{board.content || ''}</p>
                        <span className="text-[11px] text-slate-400 mt-2 block font-medium">{board.regDate}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 flex flex-col items-center justify-center h-28 text-slate-300 border-2 border-dashed border-slate-100 rounded-xl m-2 bg-slate-50/50">
                    <span className="material-symbols-outlined mb-1">check_circle</span>
                    <span className="text-xs font-medium">새로운 공지사항이 없습니다</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {isModalOpen && selectedTno && (
        <TicketDetailModal
          tno={selectedTno}
          onClose={() => setIsModalOpen(false)}
          onDelete={() => { fetchMainData(); setIsModalOpen(false); }}
        />
      )}
    </BasicLayout>
  );
};

const StatusCard = ({ title, count, color, icon, onClick, hasBadge }) => (
  <div 
    onClick={onClick} 
    className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden"
  >
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        {hasBadge ? (
          <div className="flex items-center gap-2">
            <h3 className="text-4xl font-bold text-slate-800 tracking-tight">{count}</h3>
            <span className="absolute top-5 right-5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brandOrange opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-brandOrange"></span>
            </span>
          </div>
        ) : (
          <h3 className="text-4xl font-bold text-slate-800 tracking-tight">{count}</h3>
        )}
      </div>
      <div className={`p-3 rounded-xl group-hover:bg-brandNavy group-hover:text-white transition-colors ${
        icon === 'star' ? 'bg-blue-50 text-brandNavy' :
        icon === 'mail' ? 'bg-orange-50 text-brandOrange' :
        'bg-slate-50 text-slate-600'
      }`}>
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
    </div>
    {hasBadge && (
      <p className="text-xs text-slate-400 font-medium">최근 1시간 내 수신</p>
    )}
    {!hasBadge && icon === 'star' && (
      <p className="text-xs text-slate-400 font-medium">마감 기한 임박 업무 포함</p>
    )}
  </div>
);

export default MainPage;