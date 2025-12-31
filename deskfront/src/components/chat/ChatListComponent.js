import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import MemberPickerModal from "./MemberPickerModal";
import { searchMembers } from "../../api/memberApi";

// 임시 목업: 사용자/채팅방 (백엔드 대신)
const MOCK_USERS = [
  { email: "alice@test.com", nickname: "Alice" },
  { email: "bob@test.com", nickname: "Bob" },
  { email: "charlie@test.com", nickname: "Charlie" },
  { email: "david@test.com", nickname: "David" },
];

const INITIAL_ROOMS = [
  {
    id: 1,
    isGroup: false,
    user1Id: "alice@test.com",
    user2Id: "bob@test.com",
    lastMessage: { content: "안녕!", createdAt: new Date().toISOString() },
    unreadCount: 2,
  },
  {
    id: 2,
    isGroup: true,
    name: "프로젝트 그룹",
    participants: ["alice@test.com", "bob@test.com", "charlie@test.com"],
    lastMessage: { content: "회의 자료 올렸어요", createdAt: new Date().toISOString() },
    unreadCount: 0,
  },
];

const ChatListComponent = ({ currentUserId }) => {
  const navigate = useNavigate();
  const loginInfo = useSelector((state) => state.loginSlice);

  // ✅ 백엔드 대신 로컬 상태로 목록 관리
  const [chatRooms, setChatRooms] = useState(INITIAL_ROOMS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [userInfoMap, setUserInfoMap] = useState({}); // email -> {nickname, department}

  const handleCreateChat = () => {
    setShowCreateModal(true);
    setSelectedUsers([]);
    setSearchKeyword("");
    setSelectedDepartment("");
  };

  // 멤버 검색 API 호출 (디바운싱 적용) - 검색어 또는 부서 선택 시 검색
  useEffect(() => {
    // 검색어가 2글자 미만이고 부서도 선택 안 했으면 검색 안 함
    if (searchKeyword.trim().length < 2 && !selectedDepartment) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      handleSearchMembers(searchKeyword, selectedDepartment);
    }, 300); // 300ms 디바운싱

    return () => clearTimeout(timeoutId);
  }, [searchKeyword, selectedDepartment]);

  const handleSearchMembers = async (keyword, department) => {
    setSearchLoading(true);
    setSearchError(null);
    try {
      const data = await searchMembers(keyword || null, 1, 20, department || null);
      // 현재 사용자 제외 및 DTO 변환
      const filtered = data.dtoList
        .filter((m) => m.email !== (loginInfo?.email || currentUserId))
        .map((m) => ({
          email: m.email,
          nickname: m.nickname || m.email,
          department: m.department || null,
        }));
      setSearchResults(filtered);
      
      // userInfoMap 업데이트
      const newMap = {};
      filtered.forEach(user => {
        newMap[user.email] = { nickname: user.nickname, department: user.department };
      });
      setUserInfoMap(prev => ({ ...prev, ...newMap }));
    } catch (err) {
      console.error("멤버 검색 실패:", err);
      setSearchError("멤버 검색에 실패했습니다.");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const availableUsers = useMemo(() => {
    return searchResults;
  }, [searchResults]);

  const toggleUserSelection = (email) => {
    setSelectedUsers((prev) =>
      prev.includes(email) ? prev.filter((id) => id !== email) : [...prev, email]
    );
  };

  const getChatRoomName = (room) => {
    if (room.isGroup) {
      if (room.participantInfo && room.participantInfo.length > 0) {
        const names = room.participantInfo.map(p => p.nickname);
        if (names.length <= 2) {
          return names.join(", ");
        }
        return `${names.slice(0, 2).join(", ")} 외 ${names.length - 2}명`;
      }
      return "그룹 채팅";
    } else {
      if (room.participantInfo && room.participantInfo.length > 0) {
        return room.participantInfo[0].nickname;
      }
      const otherUser = room.user1Id === currentUserId ? room.user2Id : room.user1Id;
      return otherUser || "알 수 없음";
    }
  };

  const formatLastMessage = (message) => {
    if (!message) return "메시지가 없습니다.";
    return message.content.length > 30 ? message.content.slice(0, 30) + "..." : message.content;
  };

  // 백엔드 createChatRoom 대신: 로컬에서 방 생성
  const handleCreateRoom = () => {
    if (selectedUsers.length === 0) {
      return alert("최소 1명 이상의 참여자를 선택해주세요.");
    }

    const nextId = Math.max(0, ...chatRooms.map((r) => r.id)) + 1;
    const isGroup = selectedUsers.length > 1;

    // 참여자 정보 생성
    const participantInfo = selectedUsers.map(email => ({
      email,
      nickname: userInfoMap[email]?.nickname || email
    }));

    const newRoom = isGroup
      ? {
          id: nextId,
          isGroup: true,
          participants: [currentUserId, ...selectedUsers],
          participantInfo: participantInfo,
          lastMessage: null,
          unreadCount: 0,
        }
      : {
          id: nextId,
          isGroup: false,
          user1Id: currentUserId,
          user2Id: selectedUsers[0],
          participantInfo: participantInfo,
          lastMessage: null,
          unreadCount: 0,
        };

    setChatRooms((prev) => [newRoom, ...prev]);
    setShowCreateModal(false);
    navigate(`/chat/${newRoom.id}`);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto p-8 space-y-10 bg-gray-50/30 min-h-screen">
        {/* 상단 타이틀 */}
        <div className="flex justify-between items-end mb-4">
        <div className="relative inline-block">
          <span className="text-blue-600 font-black text-xs uppercase tracking-widest mb-3 block italic">
            Chat Room
          </span>
          <h1 className="text-4xl font-black text-[#111827] mb-4 tracking-tighter uppercase">
            Chat
          </h1>
          <div className="h-1.5 w-full bg-blue-600 rounded-full shadow-[0_2px_10px_rgba(37,99,235,0.3)]"></div>
        </div>

        <div className="flex gap-3 items-center pb-2">
          <button
            onClick={handleCreateChat}
            className="bg-[#111827] text-white px-10 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 hover:-translate-y-1 transition-all duration-300 shadow-xl shadow-gray-200"
          >
            새 채팅
          </button>
        </div>
      </div>

      {/* 목록 카드 */}
      <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.05)] border border-gray-100">
        <div className="bg-[#1a1f2c] px-10 py-5 flex justify-between items-center border-b border-gray-800">
          <h2 className="text-white font-black italic tracking-widest text-xs uppercase opacity-80">
            Chat Room List
          </h2>
          <div className="flex gap-2.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
            <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
          </div>
        </div>

        <div className="p-12 min-h-[450px] bg-gradient-to-b from-white to-gray-50/30">
          {chatRooms.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              채팅방이 없습니다. 새 채팅을 시작해보세요.
            </div>
          ) : (
            <div className="space-y-3">
              {chatRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => navigate(`/chat/${room.id}`)}
                  className="p-6 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-gray-900">
                          {getChatRoomName(room)}
                        </h3>
                        {room.isGroup && (
                          <span className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full font-semibold">
                            그룹
                          </span>
                        )}
                      </div>

                      {room.lastMessage && (
                        <>
                          <p className="text-sm text-gray-600 mb-1">
                            {formatLastMessage(room.lastMessage)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(room.lastMessage.createdAt).toLocaleString()}
                          </p>
                        </>
                      )}
                    </div>

                    {room.unreadCount > 0 && (
                      <span className="px-3 py-1 bg-red-500 text-white text-xs rounded-full font-semibold">
                        {room.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* 생성 모달 */}
      <MemberPickerModal
        open={showCreateModal}
        title="새 채팅 생성"
        multi={true}
        keyword={searchKeyword}
        onChangeKeyword={setSearchKeyword}
        results={availableUsers}
        selected={selectedUsers}
        onToggle={toggleUserSelection}
        loading={searchLoading}
        error={searchError}
        onClose={() => {
          setShowCreateModal(false);
          setSearchKeyword("");
          setSelectedUsers([]);
          setSelectedDepartment("");
        }}
        selectedDepartment={selectedDepartment}
        onChangeDepartment={setSelectedDepartment}
        onConfirm={handleCreateRoom}
        showGroupName={false}
        groupName=""
        onChangeGroupName={() => {}}
      />
    </>
  );
};

export default ChatListComponent;
