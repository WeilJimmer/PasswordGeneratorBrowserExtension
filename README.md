# Password Generator Browser Extension

![GitHub License](https://img.shields.io/github/license/WeilJimmer/PasswordGeneratorBrowserExtension)
![GitHub Release](https://img.shields.io/github/v/release/WeilJimmer/PasswordGeneratorBrowserExtension)
![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/nebmcdpmbglgpmapfkejofecgeclcmok?label=ChromeWebStore&color=35AA54)
![Mozilla Add-on Version](https://img.shields.io/amo/v/wbft-password-generator?label=Mozilla-Addon&color=FD513C)

Free, ad-free, open-source simple password generator for browser.

## Downloads

<a href="https://github.com/WeilJimmer/PasswordGeneratorBrowserExtension/releases"><img src="https://wbreader.weil.app.wbftw.org/images/get-it-on-github.png" alt="Get it on Github" height="60"></a>
<a href="https://chromewebstore.google.com/detail/password-generator/nebmcdpmbglgpmapfkejofecgeclcmok"><img src="https://pgbe.weil.app.wbftw.org/chrome.png" alt="Get it on Chrome" height="60"></a>
<a href="https://addons.mozilla.org/zh-TW/firefox/addon/wbft-password-generator/"><img src="https://pgbe.weil.app.wbftw.org/firefox.png" alt="Get it on Firefox" height="60"></a>
<a href="https://microsoftedge.microsoft.com/addons/detail/njgpfdkllkoidcndpopeggheljpgkefg"><img src="https://pgbe.weil.app.wbftw.org/edge.png" alt="Get it on Edge" height="60"></a>
<a href="https://addons.opera.com/zh-tw/extensions/details/password-generator-8/"><img src="https://pgbe.weil.app.wbftw.org/opera.png" alt="Get it on Opera" height="60"></a>

## Android

Also, available for Android:

<a href="https://play.google.com/store/apps/details?id=org.wbftw.weil.passwordgenerator"><img src="https://wbreader.weil.app.wbftw.org/images/get-it-on-google-play.png" alt="Get it on Google Play" height="80"></a>
<a href="https://github.com/WeilJimmer/PasswordGeneratorApp/releases"><img src="https://wbreader.weil.app.wbftw.org/images/get-it-on-github.png" alt="Get it on Github" height="80"></a>
<a href="https://f-droid.org/packages/org.wbftw.weil.passwordgenerator/"><img src="https://wbreader.weil.app.wbftw.org/images/get-it-on-fdroid.png" alt="Get it on Fdroid" height="80"></a>

## Development Setup

### Prerequisites

- Node.js (v18+ recommended)
- npm (comes with Node.js)

### Installation

Clone the repository and install dependencies:

```
git clone https://github.com/WeilJimmer/PasswordGeneratorBrowserExtension.git
cd PasswordGeneratorBrowserExtension
npm install
```

### Build Commands

Development Build with Hot Reload

```
# For Chrome
npm run dev:chrome

# For Firefox
npm run dev:firefox
```

Production Build

```
# Build for Chrome
npm run build:chrome

# Build for Firefox
npm run build:firefox

# Build for both browsers
npm run build
```

## Loading Extensions

### Chrome

- Open chrome://extensions/
- Enable "Developer mode"
- Click "Load unpacked"
- Select the dist/chrome directory

### Firefox

- Open about:debugging
- Click "This Firefox"
- Click "Load Temporary Add-on..."
- Select any file in the dist/firefox directory

## Project Structure

```
├─ config/            # Browser-specific manifests
├─ src/               # Source code
│  ├─ assets/         # Static assets
│  ├─ background/     # Background scripts
│  ├─ modules/        # Shared modules
│  ├─ options/        # Options page
│  ├─ popup/          # Popup UI
│  └─ _locales/       # Translations
└─ dist/              # Build output
   ├─ chrome/         # Chrome extension
   └─ firefox/        # Firefox extension
```

