import React from "react";
import { createMemoryRouter } from "react-router-dom";
import Discover from "./pages/Discover";

const AppInfo = React.lazy(() => import("./pages/AppInfo"));

const Suspense: React.FC = ({ children }) => {
  // TODO: add a loading spinner
  return (
    <React.Suspense fallback={<div>Loading...</div>}>{children}</React.Suspense>
  );
};

export const router = createMemoryRouter(
  [
    {
      path: "/",
      element: <Discover />,
    },
    {
      path: "/app/:id",
      element: (
        <Suspense>
          <AppInfo />
        </Suspense>
      ),
    },
  ],
  {
    initialEntries: ["/"],
    initialIndex: 0,
  }
);
