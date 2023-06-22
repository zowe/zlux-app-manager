# Zlux App Manager Changelog

All notable changes to the Zlux App Manager will be documented in this file.

## `1.28.4`

- Bugfix: Fixed Iframes from unintentionally loading their sources multiple times during refocus & multi-app situations (#530)
- Bugfix: Replace existing snapshot preview with lighter UI to significantly increase multi-app Desktop performance (#530)

## `1.28.0`

- Bugfix that would prevent using the password reset tool for auth plugins that implemented more than one auth category

## `1.26.0`

- Fixed small bug with app tray not scaling well with some localizations

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
