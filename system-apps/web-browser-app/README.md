This program and the accompanying materials are
made available under the terms of the Eclipse Public License v2.0 which accompanies
this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

SPDX-License-Identifier: EPL-2.0

Copyright Contributors to the Zowe Project.

# Web Browser App

This is an optional app to the Zowe Desktop which is shipped with the Desktop but not enabled by default. It allows you to present a website unrelated to Zowe within the Desktop by means of an iframe that can be pointed at a destination of your choosing. The iframe is presented within an UI that is similar to that of a browser.

Do not enable this app without understanding the security footprint. Embedding websites within other websites should be done with care.

Not all websites embed properly into an iframe. Some have headers that request not being put into an iframe, and in that case the UI also includes a button you can click to enable proxy-mode. The web browser app proxy opens a new server port on the app-server for each domain that will be proxied. This way, the entire URL space of a website is available over the proxy without any URL prefix. However even still, some websites may not embed in an iframe perfectly. Websites which hardcode into their HTML specific domains will 'break out' of the proxy as these requests will not be captured. Sometimes this can make the website not load properly in the app. So, please note that this web browser app does not claim 100% compatibility of embedding websites, but hopefully you find it useful anyway.

## Building
See the zowe documentation: https://docs.zowe.org/stable/extend/extend-desktop/mvd-buildingplugins/

## Environment Variables

- `ZOWE_WEB_BROWSER_PROXY_PORT_RANGE=61000..61100`: Specifies a range of ports that the web browser app is allowed to use in proxy mode. You can have 1 (6100...61000) or more ports specified, and each domain proxied will utilize one port. The proxy attempts to clean up ports when no users of a domain remain.

## App2App Launch Metadata

The app can be launched with metadata describing a website to open to, and whether or not to show the surrounding browser UI (`hideControls`). Hiding the UI may allow for easy porting of a website into Zowe by making the web browser app appear to be a native app of a particular website.

```typescript
export interface WebBrowserLaunchMetadata {
  url: string;
  hideControls: boolean;
  enableProxy: boolean;
}
```
