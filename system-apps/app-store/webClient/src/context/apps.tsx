import React, { createContext, useContext, useState, useEffect } from "react";

type AppsContextType = {
  apps: any[];
};

const AppsContext = createContext<AppsContextType | null>(null);

export const useAppsCtx = () => useContext(AppsContext);

const AppsProvider: React.FC = ({ children }) => {
  const [apps, setApps] = useState([]);
  const [installedApps, setInstalledApps] = useState([]);

  // fetch default apps
  useEffect(() => {
    const fetchApps = async () => {
      // TODO: using mock server, need to use nodeserver
      const allAppsResponse = await fetch(
        "http://localhost:8000/appstore/api/apps"
      );
      const data = await allAppsResponse.json();
      const installedAppsResponse = await fetch("/plugins?type=all");
      const { pluginDefinitions } = await installedAppsResponse.json();
      const serializedApps = data.map((app) => {
        const installedApp = pluginDefinitions.find(
          (installedApp) => installedApp.identifier === app.identifier
        );
        if (installedApp) {
          return {
            ...app,
            installed: true,
          };
        }
        return {
          ...app,
          installed: false,
        };
      });
      setInstalledApps(serializedApps.filter((app) => app.installed));
      setApps(serializedApps);
    };
    fetchApps();
  }, []);

  return (
    <AppsContext.Provider
      value={{
        apps,
        installedApps,
      }}
    >
      {children}
    </AppsContext.Provider>
  );
};

export default AppsProvider;
