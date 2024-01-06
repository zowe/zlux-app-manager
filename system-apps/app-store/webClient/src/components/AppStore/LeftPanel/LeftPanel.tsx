import React, { useState } from "react";
import NavigationButtons from "./NavigationButtons";
import SearchBar from "./SearchBar";
import { useWindowSize } from "../../../context/window-size";
import { ASSETS_URL } from "../../../constants";
import Popup from "reactjs-popup";

const LeftPanel = () => {
  const windowSize = useWindowSize();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isMobileView = windowSize < 768; // Adjust the breakpoint as needed

  const renderMenu = () => {
    return (
      <button
        onClick={toggleMenu}
        style={{
          border: "none",
          background: "none",
          cursor: "pointer",
          outline: "none",
        }}
      >
        <img width={24} height={24} src={ASSETS_URL + "menu.svg"} alt="menu" />
      </button>
    );
  };

  return (
    <div>
      {isMobileView ? (
        <div
          style={{
            marginTop: "10px",
            padding: "0 10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Popup arrow={false} trigger={renderMenu()} position="bottom left">
              <div
                style={{
                  backgroundColor: "#222",
                  minWidth: "100px",
                  padding: "10px",
                  borderRadius: "10px",
                }}
              >
                <NavigationButtons />
              </div>
            </Popup>
            <SearchBar />
          </div>
        </div>
      ) : (
        <div
          style={{
            minWidth: "200px",
            padding: "0 10px",
            boxSizing: "border-box",
            marginTop: "10px",
            position: "sticky",
            top: "10px",
          }}
        >
          <SearchBar />
          <NavigationButtons />
        </div>
      )}
    </div>
  );
};

export default LeftPanel;
