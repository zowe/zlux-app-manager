import React from "react";
import LeftPanel from "./LeftPanel/LeftPanel";
import RightPanel from "./RightPanel/RightPanel";
import { useWindowSize } from "../../context/window-size";
import "../../styles/globals.css";

const AppStoreLayout: React.FC = ({ children }) => {
  const windowSize = useWindowSize();
  return (
    <div
      className="appStoreContainer"
      style={{
        display: "flex",
        flexDirection: windowSize < 768 ? "column" : "row",
      }}
    >
      <LeftPanel />
      <RightPanel>{children}</RightPanel>
    </div>
  );
};

export default AppStoreLayout;
