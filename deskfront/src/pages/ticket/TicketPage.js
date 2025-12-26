<<<<<<< HEAD
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import TicketComponent from "../../components/ticket/TicketComponent";
=======
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import TicketComponent from '../../components/ticket/TicketComponent';
import TicketDetailModal from "../../components/ticket/TicketDetailModal";
import { getSentTickets, getReceivedTickets, getAllTickets } from '../../api/ticketApi';
>>>>>>> 844f24cfe8af8e00e3ae8322d770f4a17a6c51dd

const TicketPage = () => {
  const loginState = useSelector((state) => state.loginSlice);
  const navigate = useNavigate();

<<<<<<< HEAD
  useEffect(() => {
    if (!loginState.email) {
      alert("로그인이 필요한 서비스입니다.");
      navigate("/member/login", { replace: true });
=======
    const [tab, setTab] = useState('ALL');

    const [selectedTno, setSelectedTno] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // TicketComponent 클릭시 호출할 핸들러
    const openTicketModal = (tno) => {
      if (!tno) return;
      setSelectedTno(tno);
      setIsModalOpen(true);
    };

    const closeTicketModal = () => {
      setIsModalOpen(false);
      setSelectedTno(null);
    };

    const handleDeleted = () => {
      fetchData();
    };

    // PageResponseDTO 구조에 맞게 초기 상태 수정
    const [data, setData] = useState({
        dtoList: [],
        pageNumList: [],
        current: 1,
        prev: false,
        next: false,
        totalCount: 0
    });

    // 페이지 번호는 1부터 시작 (백엔드 PageRequestDTO 규격)
    const [page, setPage] = useState(1);

    // 초기 상태값
    const [activeFilter, setActiveFilter] = useState({ keyword: '', grade: '', sort: 'tno,desc' }); // 기본 최신순
    const [searchParams, setSearchParams] = useState({ keyword: '', grade: '', sort: 'tno,desc' });

const fetchData = useCallback(async () => {
    if (!currentUserEmail) return;

    // pageParam에 sort를 포함시킴 (PageRequestDTO의 필드와 매칭)
    const pageParam = {
        page: page,
        size: 10,
        sort: activeFilter.sort
    };

    const filterParam = {
        keyword: activeFilter.keyword,
        grade: activeFilter.grade === "" ? null : activeFilter.grade
        // 여기서 sort를 빼고 pageParam으로 옮기는 것이 정석입니다.
    };

    try {
        let result;
        // API 호출 시 pageParam(정렬포함)과 filterParam(검색어포함) 전달
        if (tab === 'SENT') {
            result = await getSentTickets(currentUserEmail, pageParam, filterParam);
        } else if (tab === 'RECEIVED') {
            result = await getReceivedTickets(currentUserEmail, pageParam, filterParam);
        } else {
            result = await getAllTickets(currentUserEmail, pageParam, filterParam);
        }
        setData(result);
    } catch (error) {
        console.error("로딩 실패", error);
>>>>>>> 844f24cfe8af8e00e3ae8322d770f4a17a6c51dd
    }
  }, [loginState.email, navigate]);

  if (!loginState.email) return null;

<<<<<<< HEAD
  return (
    <div className="w-full bg-gray-100 min-h-screen py-8">
      <div className="max-w-[1280px] mx-auto px-4">
        <div className="bg-white shadow-md rounded-2xl p-8 min-h-[800px]">
          <TicketComponent />
=======
    const handleSearch = () => {
        setActiveFilter({ ...searchParams });
        setPage(1); // 검색 시 1페이지로 리셋
    };

    // 페이지 이동 핸들러
    const movePageHandler = (pageParam) => {
        setPage(pageParam.page);
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-black mb-8">티켓 함</h1>

            {/* 검색 및 필터 UI */}
            <div className="bg-white p-5 rounded-xl shadow-lg border flex items-center gap-3 mb-8">
                <input
                    className="flex-1 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="검색어를 입력하세요 (제목, 본문, 요청자)..."
                    value={searchParams.keyword}
                    onChange={(e) => setSearchParams({...searchParams, keyword: e.target.value})}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />

                 {/* 검색 UI 내 정렬 셀렉트 박스 */}
                  <select
                      className="border border-gray-300 p-3 rounded-lg bg-gray-50 font-bold text-gray-700 w-44"
                      value={searchParams.sort}
                      onChange={(e) => setSearchParams({...searchParams, sort: e.target.value})}
                  >
                      <option value="tno,desc">🆕 최신 등록순</option> {/* 추가 */}
                      <option value="deadline,asc">⏰ 마감일 빠른순</option>
                      <option value="deadline,desc">📅 마감일 늦은순</option>
                  </select>

                <select
                    className="border border-gray-300 p-3 rounded-lg bg-gray-50 font-bold text-gray-700 w-40"
                    value={searchParams.grade}
                    onChange={(e) => setSearchParams({...searchParams, grade: e.target.value})}
                >
                    <option value="">모든 중요도</option>
                    <option value="HIGH">🔴 높음</option>
                    <option value="MIDDLE">🟡 보통</option>
                    <option value="LOW">🟢 낮음</option>
                </select>

                <button
                    onClick={handleSearch}
                    className="bg-gray-900 text-white px-8 py-3 rounded-lg font-black hover:bg-black transition-all"
                >
                    검색
                </button>
            </div>

            {/* 탭 메뉴 */}
            <div className="flex gap-3 mb-6">
                {['ALL', 'SENT', 'RECEIVED'].map((t) => (
                    <button
                        key={t}
                        onClick={() => { setTab(t); setPage(1); }} // 탭 변경 시 1페이지로
                        className={`px-10 py-3 rounded-xl font-black transition-all ${
                            tab === t ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                    >
                        {t === 'ALL' ? '전체' : t === 'SENT' ? '보낸 티켓' : '받은 티켓'}
                    </button>
                ))}
            </div>

            <TicketComponent
                ticketList={data.dtoList}
                serverData={data}
                movePage={movePageHandler}
                onRowClick={openTicketModal}
            />

            {isModalOpen && selectedTno && (
              <TicketDetailModal
                tno={selectedTno}
                onClose={closeTicketModal}
                onDelete={handleDeleted}
              />
            )}
>>>>>>> 844f24cfe8af8e00e3ae8322d770f4a17a6c51dd
        </div>
      </div>
    </div>
  );
};

export default TicketPage;