import React from "react";
import AppStoreLayout from "../components/AppStore/AppStoreLayout";
import { useAppsCtx } from "../context/apps";
import { AppCard, Section } from "../components/UI";
import { useWindowSize } from "../context/window-size";

const InstalledApps = () => {
  const { installedApps } = useAppsCtx();
  const windowSize = useWindowSize();
  return (
    <AppStoreLayout>
      <Section title="Installed Apps">
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              windowSize < 768
                ? "1fr"
                : windowSize < 1024
                ? "1fr 1fr"
                : "1fr 1fr 1fr",
            gridGap: "20px",
            marginLeft: "20px",
          }}
        >
          {installedApps.map((app) => (
            <AppCard
              key={app.identifier}
              id={app.identifier}
              name={app.webContent.launchDefinition.pluginShortNameDefault}
              description={app.webContent.descriptionDefault}
              icon={app.webContent.launchDefinition.imageSrc}
              publisher={app?.author || "Zowe"}
              installed={app.installed}
            />
          ))}
        </div>
      </Section>
    </AppStoreLayout>
  );
};

export default InstalledApps;
