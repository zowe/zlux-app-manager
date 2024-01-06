import React from "react";
import AppStoreLayout from "../components/AppStore/AppStoreLayout";
import { Section } from "../components/UI";

const Help = () => {
  return (
    <AppStoreLayout>
      <Section title="Help">
        <div style={{ width: "90%" }}>
          <p style={{ color: "#fff" }}>
            The App Store uses zwe commands under the hood and requires a zowe
            instance to be configured. If you have not configured it yet, please
            follow the instructions below.
            <br />
            <br />
            <b>Note:</b> Make changes to zowe.yaml file so that it understands
            that you'll be installing plugins from external sources
            (registries). Follow{" "}
            <a
              target="_blank"
              rel="noreferrer"
              href="https://docs.zowe.org/stable/extend/component-registries/#configuring-zwe-to-use-a-registry"
            >
              this
            </a>
            .
          </p>
          <p style={{ color: "#fff" }}>
            For more help, please join our Slack channel or raise an issue on
            GitHub.
          </p>
          <div style={{ display: "flex" }}>
            <a
              target="_blank"
              rel="noreferrer"
              href="https://app.slack.com/client/T1BAJVCTY/CBW5ET69G"
              style={{
                marginRight: 10,
                display: "flex",
                alignItems: "center",
                color: "#fff",
                textDecoration: "none",
                backgroundColor: "#3f0f40",
                padding: "5px 10px",
                borderRadius: 5,
              }}
            >
              <img
                width={24}
                height={24}
                src="https://cdn.worldvectorlogo.com/logos/slack-new-logo.svg"
                alt="slack"
              />
              <span style={{ marginLeft: "10px" }}>
                Join <b>#zowe-dev</b> channel
              </span>
            </a>
            <a
              target="_blank"
              rel="noreferrer"
              href="https://github.com/zowe/zlux-app-manager"
              style={{
                display: "flex",
                alignItems: "center",
                textDecoration: "none",
                color: "#fff",
                padding: "5px 10px",
                borderRadius: 5,
                backgroundColor: "#222",
              }}
            >
              <img
                width={24}
                height={24}
                src="https://img.icons8.com/ios-filled/50/FFFFFF/github.png"
                alt="github"
              />
              <span style={{ marginLeft: "10px" }}>GitHub</span>
            </a>
          </div>
        </div>
      </Section>
    </AppStoreLayout>
  );
};

export default Help;
