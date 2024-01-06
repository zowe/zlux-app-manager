import React from "react";
import AppStoreLayout from "../components/AppStore/AppStoreLayout";
import { Section } from "../components/UI";

const OnPremise = () => {
  return (
    <AppStoreLayout>
      <Section title="On-Premise">
        <div style={{ width: "90%" }}>
          <p style={{ color: "#fff" }}>Enter your registry URL here</p>
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
            placeholder="For example: https://registry.npmjs.org/"
          />
          <button
            style={{
              padding: "5px 10px",
              borderRadius: "5px",
              border: "none",
              outline: "none",
              color: "whitesmoke",
              cursor: "pointer",
              backgroundColor: "#3162ac",
            }}
          >
            Save
          </button>
        </div>
      </Section>
    </AppStoreLayout>
  );
};

export default OnPremise;
