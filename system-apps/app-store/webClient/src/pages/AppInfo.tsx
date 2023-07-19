import React from "react";
import AppStoreLayout from "../components/AppStore/AppStoreLayout";
import { useParams, Link } from "react-router-dom";
import { APPS, ASSETS_URL } from "../constants";
import { CustomPrevArrow } from "../components/UI";

const AppPage = () => {
  const { id } = useParams();

  if (!id) {
    // TODO: return a not found page
    return null;
  }

  const app = APPS.find((app) => app.id === parseInt(id));

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
              src={app?.icon}
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
                {app?.publisher}
              </p>
              <h2
                style={{
                  color: "#fff",
                  fontWeight: 300,
                  fontSize: "20px",
                  marginBottom: "10px",
                }}
              >
                {app?.name}
              </h2>
              <p
                style={{
                  color: "#aaa",
                  fontSize: "12px",
                  marginBottom: "4px",
                }}
              >
                com.zowe.org
              </p>
              <p
                style={{
                  color: "#aaa",
                  fontSize: "12px",
                  marginBottom: "4px",
                }}
              >
                v0.0.1
              </p>
            </div>
          </div>
          <button
            style={{
              backgroundColor: "#3162ac",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 300,
              height: "40px",
            }}
          >
            Install
          </button>
        </div>
      </div>
    </AppStoreLayout>
  );
};

export default AppPage;
