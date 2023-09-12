import React from "react";
import AppStoreLayout from "../components/AppStore/AppStoreLayout";
import { Section } from "../components/UI";

const Settings = () => {
  return (
    <AppStoreLayout>
      <Section title="Settings">
        <div style={{ width: "90%" }}>
          <p style={{ color: "#fff" }}>Enter your zowe config file path</p>
          <input
            style={{
              width: "100%",
              height: "40px",
              border: "1px solid #333",
              borderRadius: "5px",
              padding: "0 10px",
              outline: "none",
              fontSize: "16px",
              color: "#fff",
              backgroundColor: "#222",
              marginBottom: "20px",
            }}
            placeholder="For example: /usr/home/.zowe/zowe.yaml"
          />

          <p style={{ color: "#fff" }}>Select a handler</p>
          <div class="select">
            <select>
              <option value="npm">npm</option>
              <option value="conda">conda</option>
            </select>
          </div>

          <button
            style={{
              padding: "5px 10px",
              borderRadius: "5px",
              border: "none",
              outline: "none",
              color: "whitesmoke",
              cursor: "pointer",
              backgroundColor: "#3162ac",
              marginTop: "20px",
            }}
          >
            Save
          </button>
        </div>
      </Section>
    </AppStoreLayout>
  );
};

export default Settings;
