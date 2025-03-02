# Password Generator Browser Extension

Free, ad-free, open-source simple password generator for browser.

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

