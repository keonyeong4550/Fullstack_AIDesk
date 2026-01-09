import { Suspense, lazy } from "react";
import { Navigate } from "react-router-dom";
import LoadingModal from "../components/common/LoadingModal";


const Loading = <LoadingModal isOpen={true} message="로딩 중입니다" />;
const TicketPage = lazy(() => import("../pages/ticket/TicketPage"));

const ticketRouter = () => {
  return [
    {
      path: "list",
      element: (
        <Suspense fallback={Loading}>
          <TicketPage />
        </Suspense>
      ),
    },
    {
      path: "",
      element: <Navigate replace to={`list${window.location.search}`} />,
    }
  ];
};

export default ticketRouter;
