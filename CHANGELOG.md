# Zlux App Manager Changelog

All notable changes to the Zlux App Manager will be documented in this file.

## `3.0.0`

- Enhancement: Updated all webpack configurations across supported zlux-app-manager apps (virtual-desktop, bootstrap, app-prop-viewer,
web-browser-app, system-settings-preferences) from 4 --> 5. This includes all associated loaders, modules, and dependencies with removal of deprecated ones. Old Webpack 4 base configuration has been left for app's backwards compatibility. For more information, visit https://www.zowe.org/vnext 

## `2.10.0`
 
- Bugfix: Fixed a timing issue with the iframe-adapter for Firefox (#532)

## `2.8.0`

- Bugfix: Fixed the iframe-adapter not properly recognizing standalone mode
- Bugfix: Fixed Iframes from unintentionally loading their sources multiple times during refocus & multi-app situations
- Enhancement: Added new isSingleAppModeSimple() to iframe-adapter to differentiate between standalone mode and simple standalone mode
- Enhancement: Replace existing snapshot preview with lighter UI to magnitudes increase multi-app Desktop performance

## `2.0.0`

- Enhancement: New desktop library versions: Angular 6->12, Corejs 2->3, Typescript 2->4 etc. For more information, visit https://www.zowe.org/vnext
- Breaking change: Due to new library versions, native apps such as Angular and React apps written for Zowe v1 may not work in Zowe v2. Rebuilding the apps with the same versions and the latest webpack build scripts is recommended.
- Enhancement: The web-browser and admin-desktop-notification apps now contains a manifest file so that it can be installed with `zwe components install`

## `1.25.0`

- Fixed a bug where using app2app with incorrectly formatted data would not honor launch/message request

## `1.24.0`

- Error messages on Desktop login screen are now more descriptive
- Fixed a rare edgecase where you could close the primary (first) App window in standalone mode

## `1.23.0`

- Improved ways to detect cookie name during HA and non-HA mode

## `1.21.0`

- Adds a global "environment" object in ZoweZLUX which allows for retrieving select environment properties from the zowe instance for conditional decision-making
- Desktop uses the new environment object to determine whether or not to contact ZSS through App server or through APIML depending on if ZSS is found on APIML

## `1.18.0`

- Enhanced standalone/single app mode such that Desktop actions (Notifications, right click context menu, etc.) are now available

## `1.16.0`

- Added the relevant chmod/chown arguments to the Zowe URI Broker to enable the changing of ownership & permissions of USS files & folders
- Added a missing translation for German, French, and Chinese

## `1.14.0`

- [D] Fixed case in which the URI broker for unixfile would allow 3 or more slashes in a row
- Fixed GET call for recognizers & actions such that they are loaded into dispatcher

## `1.13.0`

- Updated translations for Personalization menu
- Removed usage of ngx-color in place of a custom color selector
- Converted login activity to event emitter
- Added new local storage listener so changes can be reported across tabs
- Added detect activity when login from new window/tab

## `1.12.0`

- Added iframe support for spawning a context menu when in single-app mode (via viewportevents instead of windowactions
- Added support for changing desktop color theme
- Added support for changing desktop size
- Support for changing wallpaper (with drag & drop)
- User can revert back to normal
- Text color + window handle color adjusts based on the lightness of user's chosen theme color
- Server timeout notification has been re-skinned to match new theme
- Zowe version info has been added back onto login page
- Color slider has been optimized to not fire too many network requests
- Changed desktop highlighting to match theme
- Created an injectible service for the theme emitting
- Created a token for the theme emitting injector (where a normal injectible isn't viable)
- Timeout notification scales with desktop size
- Support /api/v1/zlux under api root


## `1.13.0`
- Added new storage service to report last activity across tabs
- Cross-launch app via URL
- Fixed i18n compile errors
- Removed usage of ngx-color

## `1.14.0`
- Updated vulnerable dependencies
- Renew session on every new tab/window
- Added session logout and expired event to storage service to report across tabs
