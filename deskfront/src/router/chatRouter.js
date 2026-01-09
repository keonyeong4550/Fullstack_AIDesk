import { Suspense, lazy } from "react";
import { Navigate } from "react-router-dom";
import LoadingModal from "../components/common/LoadingModal";

const Loading = <LoadingModal isOpen={true} message="로딩 중입니다" />;
const ChatListPage = lazy(() => import("../pages/chat/ChatListPage"));
const ChatPage = lazy(() => import("../pages/chat/ChatPage"));

const chatRouter = () => {
  return [
    {
      path: "",
      element: (
        <Suspense fallback={Loading}>
          <ChatListPage />
        </Suspense>
      ),
    },
    {
      path: ":chatRoomId",
      element: (
        <Suspense fallback={Loading}>
          <ChatPage />
        </Suspense>
      ),
    },
  ];
};

export default chatRouter;