# OpenDeck Weather Plugin

## Overview
OpenDeck weather plugin powered by OpenWeatherMap. Displays live weather on Stream Deck / OpenDeck keys with two display styles, dynamic backgrounds, and proper contrast.

## Dev Commands
- `npm start` — run the plugin locally (requires OpenDeck to launch it)
- `npm run log` — tail the plugin log
- `npm run clean` — remove node_modules and lockfile for clean reinstall

## Architecture
- `index.js` — Main plugin entry. CommonJS (`require`). WebSocket client connecting to OpenDeck at `ws://127.0.0.1:<port>`.
- `manifest.json` — OpenDeck plugin manifest (v1.9.0). UUID = folder name `com.plungarini.weather.sdPlugin`.
- `pi/index.html` — Property Inspector settings UI. Defines `connectOpenActionSocket` and `connectElgatoStreamDeckSocket` globally.
- `icons/` — Pre-rendered Phosphor icon PNGs (white-filled, tinted at runtime via canvas compositing) + SVG icons for action/plugin listing.

## Key Patterns
- **CommonJS** — all working OpenDeck Node.js plugins use `require`, not `import`.
- **Canvas compositing** — `@napi-rs/canvas` for rendering backgrounds, icons (tinted via `destination-in` composite), and text to PNG.
- **Day/night palettes** — format `[dayTop, dayBottom, dayText, nightTop, nightBottom, nightText]`. Neural gray/slate tones.
- **Icons** — white PNGs. Day: tinted dark via `destination-in`. Night: drawn as-is (white on dark bg).
- **Property Inspector** — communicates settings back to plugin via `setSettings` event.

## Important
- No shadow, no glow, no hand-drawn SVG — direct colors and pre-rendered icon PNGs only.
- Minimun refresh interval: 30 seconds.
- Default refresh: 3600s (1 hour).
- Plugin UUID = folder name (`com.plungarini.weather.sdPlugin`).
- OpenDeck runs: `node index.js -port PORT -pluginUUID UUID -registerEvent registerPlugin -info INFO`
