# chrome-parcellab-demo-plugin

A Chrome Manifest V3 demo extension for parcelLab sales demos.

It lets you:

- target an element on the current page
- hide that element
- replace an element's contents with custom HTML
- save each rule against the current URL
- auto-apply saved rules when you revisit that page
- delete saved rules from the popup

## Stack

- React + TypeScript for the popup UI
- Tailwind CSS for popup styling
- Vite for the popup build
- esbuild for the background service worker and content script bundles
- `chrome.storage.local` for persistence
- `chrome.scripting.registerContentScripts()` for replaying saved rules only on matching pages

## Why this structure

This implementation follows the same MV3 building blocks shown in Google's official samples:

- `functional-samples/tutorial.getting-started` for popup-driven extension structure
- `api-samples/storage/stylizr` for extension-side persistence with `chrome.storage`
- `api-samples/scripting` for dynamic content script registration with `chrome.scripting`

## Development

Install dependencies:

```bash
npm install
```

Build once:

```bash
npm run build
```

Watch for changes:

```bash
npm run dev
```

Load the unpacked extension from `dist/` in Chrome:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select `/Users/julian/Code/chrome-parcellab-demo-plugin/dist`

## Usage

1. Open the target webshop page.
2. Open the extension popup.
3. Click `Pick Element To Hide` or `Pick Element To Replace`.
4. Click the element on the page.
5. Reopen the popup later if you want to delete the saved rule.

The extension saves rules to the exact page URL except for the hash fragment.

## Notes

- Replace rules overwrite `innerHTML` of the selected container.
- Hide rules use `display: none !important` so the current page can be restored when you delete a rule.
- Selector generation is designed for demo use, not for long-term production-grade DOM automation. If the page structure changes heavily, the saved selector may stop matching.
