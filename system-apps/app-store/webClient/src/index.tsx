import React from "react";
import ReactDOM from "react-dom";
import { ReactMVDResources } from "pluginlib/react-inject-resources";
import { MVDResources } from "./context/mvd-resources";
import WindowSizeProvider from "./context/window-size";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import AppsProvider from "./context/apps";

export function renderPlugin(
  domElement: HTMLElement,
  resources: ReactMVDResources
): void {
  ReactDOM.render(
    <MVDResources.Provider value={resources}>
      <WindowSizeProvider mvdResources={resources}>
        <AppsProvider>
          <RouterProvider router={router} />
        </AppsProvider>
      </WindowSizeProvider>
    </MVDResources.Provider>,
    domElement
  );
}

export function unmountPlugin(domElement: HTMLElement): void {
  ReactDOM.unmountComponentAtNode(domElement);
}
