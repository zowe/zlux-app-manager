import React from "react";
import ReactDOM from "react-dom";
import { ReactMVDResources } from "pluginlib/react-inject-resources";
import { MVDResources } from "./context/mvd-resources";
import WindowSizeProvider from "./context/window-size";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";

export function renderPlugin(
  domElement: HTMLElement,
  resources: ReactMVDResources
): void {
  ReactDOM.render(
    <MVDResources.Provider value={resources}>
      <WindowSizeProvider mvdResources={resources}>
        <RouterProvider router={router} />
      </WindowSizeProvider>
    </MVDResources.Provider>,
    domElement
  );
}

export function unmountPlugin(domElement: HTMLElement): void {
  ReactDOM.unmountComponentAtNode(domElement);
}
