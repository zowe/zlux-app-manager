# Zlux App Manager Changelog

All notable changes to the Zlux App Manager will be documented in this file.

## `1.12.0`

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