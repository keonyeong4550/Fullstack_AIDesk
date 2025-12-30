import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";

const Loading = <div className="bg-white">Loading...</div>;
const FileBoxPage = lazy(() => import("../pages/fileBox/FileBoxPage"));

const fileBoxRouter = () => {
  return [
    {
      path: "",
      element: <Navigate to="list" replace />,
    },
    {
      path: "list",
      element: (
        <Suspense fallback={Loading}>
          <FileBoxPage />
        </Suspense>
      ),
    },
  ];
};

export default fileBoxRouter;
