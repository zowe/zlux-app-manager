import React from "react";
import AppStoreLayout from "../components/AppStore/AppStoreLayout";
import { useParams, Link } from "react-router-dom";
import { ASSETS_URL } from "../constants";
import { useAppsCtx } from "../context/apps";

const AppPage = () => {
  const { id } = useParams();
  const { apps } = useAppsCtx();

  if (!id) {
    // TODO: return a not found page
    return null;
  }

  const app = apps?.find((app) => app.identifier === id);

  return (
    <AppStoreLayout>
      <div
        style={{
          padding: "20px",
          borderBottom: "1px solid #444",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
          }}
        >
          <Link
            to="/"
            style={{
              color: "#aaa",
              fontSize: "14px",
            }}
          >
            <img
              src={ASSETS_URL + "/arrow-left.svg"}
              alt="back arrow"
              style={{
                width: "16px",
                height: "16px",
                marginRight: "4px",
              }}
            />
            Back
          </Link>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "20px",
            marginLeft: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <img
              src={app.webContent.launchDefinition.imageSrc}
              alt="app icon"
              style={{
                width: "96px",
                height: "96px",
                borderRadius: "10px",
              }}
            />
            <div
              style={{
                marginLeft: "20px",
              }}
            >
              <p
                style={{
                  color: "#aaa",
                  fontSize: "12px",
                  marginBottom: "2px",
                }}
              >
                {app?.author || "Zowe"}
              </p>
              <h2
                style={{
                  color: "#fff",
                  fontWeight: 300,
                  fontSize: "20px",
                  marginBottom: "10px",
                }}
              >
                {app.webContent.launchDefinition.pluginShortNameDefault}
              </h2>
              <p
                style={{
                  color: "#aaa",
                  fontSize: "12px",
                  marginBottom: "4px",
                }}
              >
                {app.identifier}
              </p>
              <p
                style={{
                  color: "#aaa",
                  fontSize: "12px",
                  marginBottom: "4px",
                }}
              >
                v{app.pluginVersion}
              </p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
            }}
          >
            <button
              disabled={app.installed}
              style={
                app.installed
                  ? {
                      display: "flex",
                      alignItems: "center",
                      backgroundColor: "#444",
                      color: "#aaa",
                      border: "none",
                      borderRadius: "10px",
                      padding: "10px 20px",
                      fontSize: "14px",
                      fontWeight: 300,
                      cursor: "not-allowed",
                    }
                  : {
                      display: "flex",
                      alignItems: "center",
                      backgroundColor: "#3162ac",
                      color: "#fff",
                      border: "none",
                      borderRadius: "10px",
                      padding: "10px 20px",
                      fontSize: "14px",
                      fontWeight: 300,
                      height: "40px",
                    }
              }
            >
              <img
                src={
                  app.installed
                    ? ASSETS_URL + "/installed.svg"
                    : ASSETS_URL + "/download.svg"
                }
                width={20}
                height={20}
                style={{
                  marginRight: "4px",
                }}
              />
              {app.installed ? "Installed" : "Install"}
            </button>
            {app.installed && (
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: 300,
                  height: "40px",
                  marginLeft: "10px",
                }}
              >
                <img
                  src={ASSETS_URL + "/uninstall.svg"}
                  width={20}
                  height={20}
                  style={{
                    marginRight: "4px",
                  }}
                />
                Uninstall
              </button>
            )}
          </div>
        </div>
      </div>
      <div style={{ marginTop: "10px", marginLeft: "10px" }}>
        <p
          style={{
            color: "#f2f2f2",
            fontSize: 16,
          }}
        >
          App Description: {app.webContent.descriptionDefault}
        </p>
        {app.license && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <img src={ASSETS_URL + "/license.svg"} />
            <p style={{ color: "grey", marginLeft: "10px", marginTop: "10px" }}>
              License: {app.license}
            </p>
          </div>
        )}
        {app.homepage && (
          <a
            href={app.homepage}
            alt="App Homepage"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="#fff"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        )}
      </div>
    </AppStoreLayout>
  );
};

export default AppPage;
