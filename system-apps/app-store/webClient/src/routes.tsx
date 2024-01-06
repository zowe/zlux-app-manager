import React from "react";
import { createMemoryRouter } from "react-router-dom";
import Discover from "./pages/Discover";
import InstalledApps from "./pages/InstalledApps";
import Help from "./pages/Help";
import OnPremise from "./pages/OnPremise";
import Settings from "./pages/Settings";
import Updates from "./pages/Updates";

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
    {
      path: "/installed",
      element: <InstalledApps />,
    },
    {
      path: "/help",
      element: <Help />,
    },
    {
      path: "/on-premise",
      element: <OnPremise />,
    },
    {
      path: "/settings",
      element: <Settings />,
    },
    {
      path: "/updates",
      element: <Updates />,
    },
  ],
  {
    initialEntries: ["/"],
    initialIndex: 0,
  }
);
