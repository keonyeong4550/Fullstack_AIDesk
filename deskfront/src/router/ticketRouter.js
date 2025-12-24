import { Suspense, lazy } from "react";
import { Navigate } from "react-router-dom";


const Loading = <div>Loading....</div>;
const TicketPage = lazy(() => import("../pages/ticket/TicketPage"));

const todoRouter = () => {
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
      element: <Navigate replace to="list" />,
    }
  ];
};

export default todoRouter;
