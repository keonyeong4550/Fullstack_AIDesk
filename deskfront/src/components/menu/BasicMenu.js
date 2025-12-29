import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../slices/loginSlice";
import CommonModal from "../common/CommonModal";
import useCustomLogin from "../../hooks/useCustomLogin";
import AIChatWidget from "./AIChatWidget"; // [NEW] AI 위젯 임포트

const BasicMenu = () => {
  const loginState = useSelector((state) => state.loginSlice);
  const dispatch = useDispatch();
  const { moveToPath } = useCustomLogin();

  // 모달 상태 관리
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // [NEW] AI 위젯 모달 상태
  const [isAIWidgetOpen, setIsAIWidgetOpen] = useState(false);

  // 관리자 권한 확인
  const isAdmin =
    loginState.roleNames && loginState.roleNames.includes("ADMIN");

  // 로그아웃 버튼 클릭 핸들러
  const handleClickLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = () => {
    dispatch(logout());
    setIsLogoutModalOpen(false);
    moveToPath("/");
  };

  const handleCloseModal = () => {
    setIsLogoutModalOpen(false);
  };

  // [NEW] AI 위젯 열기/닫기 핸들러
  const openAIWidget = () => setIsAIWidgetOpen(true);
  const closeAIWidget = () => setIsAIWidgetOpen(false);

  return (
    <>
      {/* --- 공통 모달 (로그아웃 확인용) --- */}
      {isLogoutModalOpen && (
        <CommonModal
          isOpen={isLogoutModalOpen}
          title={"Logout Check"}
          content={"정말 로그아웃 하시겠습니까?"}
          callbackFn={handleConfirmLogout}
          closeFn={handleCloseModal}
        />
      )}

      {/* --- [NEW] AI 업무 비서 위젯 모달 --- */}
      {isAIWidgetOpen && <AIChatWidget onClose={closeAIWidget} />}

      <nav id="navbar" className="flex bg-blue-300">
        <div className="w-4/5 bg-gray-500">
          <ul className="flex p-4 text-white font-bold items-center">
            <li className="pr-6 text-2xl">
              <Link to={"/"}>Main</Link>
            </li>
            <li className="pr-6 text-2xl">
              <Link to={"/about"}>About</Link>
            </li>

            {loginState.email ? (
              <>
                <li className="pr-6 text-2xl">
                  <Link to={"/todo/"}>Todo</Link>
                </li>
                <li className="pr-6 text-2xl">
                  <Link to={"/tickets/"}>tickets</Link>
                </li>

                {/* [NEW] AI 업무 비서 버튼 (로그인 시에만 노출) */}
                <li className="pr-6">
                  <button
                    onClick={openAIWidget}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-colors shadow-lg"
                  >
                    <span>🤖</span>
                    <span>AI 업무 비서</span>
                  </button>
                </li>

                {isAdmin && (
                  <li className="pr-6 text-2xl text-yellow-300">
                    <Link to={"/admin"}>Admin</Link>
                  </li>
                )}
              </>
            ) : (
              <></>
            )}
          </ul>
        </div>

        <div className="w-1/5 flex justify-end bg-orange-300 p-4 font-medium">
          {!loginState.email ? (
            <div className="text-white text-sm m-1 rounded cursor-pointer">
              <Link to={"/member/login"}>Login</Link>
            </div>
          ) : (
            <div
              className="text-white text-sm m-1 rounded cursor-pointer font-bold hover:text-gray-200"
              onClick={handleClickLogout}
            >
              Logout
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default BasicMenu;
