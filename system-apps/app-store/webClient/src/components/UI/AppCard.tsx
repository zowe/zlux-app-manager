import React from "react";
import { trunc } from "../../utils";
import { ASSETS_URL } from "../../constants";
import { Link } from "react-router-dom";

type AppProps = {
  name: string;
  icon: string;
  description: string;
  publisher: string;
  id: string;
  installed: boolean;
};

const App: React.FC<AppProps> = ({
  name,
  icon,
  description,
  publisher,
  id,
  installed,
}) => {
  return (
    <Link to={`/app/${id}`} className={"appContainer"}>
      <img className={"appIcon"} src={icon} alt={name} />
      <div className={"appInfoContainer"}>
        <div className={"appNameContainer"}>
          <span className={"appPublisher"}>{publisher}</span>
          <span className={"appName"}>{name}</span>
        </div>
        <span className={"appDescription"}>{trunc(description, 36)}</span>
        <button className={"installButton"} disabled={installed}>
          <img
            src={
              installed
                ? ASSETS_URL + "/installed.svg"
                : ASSETS_URL + "/download.svg"
            }
            width={14}
            height={14}
            style={{
              marginRight: "4px",
            }}
          />
          {installed ? "Installed" : "Install"}
        </button>
      </div>
    </Link>
  );
};

export default App;
