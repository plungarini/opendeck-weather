# OpenDeck Weather Plugin

Live weather widget for [OpenDeck](https://opendeck.ai) / Elgato Stream Deck powered by [OpenWeatherMap](https://openweathermap.org/api).

![Icon](icons/plugin.svg)

## Features

- **Two display styles** — Icon with optional temperature label, or big temperature text
- **Dynamic backgrounds** — Neutral gray/slate gradients that adapt to weather conditions and day/night
- **Auto-refresh** — Configurable interval (30s to 24h, default 1 hour)
- **14 weather icons** — Phosphor-style icons tinted at runtime for optimal contrast
- **Property Inspector** — Full settings UI for API key, city, units, style, and interval

## Requirements

- [OpenDeck](https://opendeck.ai) v2.0+ or Elgato Stream Deck
- [Node.js](https://nodejs.org) v18+
- [OpenWeatherMap API key](https://home.openweathermap.org/api_keys) (free tier)

## Installation

```bash
# Clone the repo
git clone <repo-url> weather
cd weather

# Install dependencies
npm install

# Sync into the OpenDeck plugins directory (creates ~/.config/opendeck/plugins/com.plungarini.weather.sdPlugin/)
npm run sync
```

Restart OpenDeck. The Weather action will appear in the action list under the "Weather" category.

> **Note:** The OpenDeck install dir must be named `com.plungarini.weather.sdPlugin` (OpenDeck derives the plugin UUID from the folder name) and must be a **real directory**, not a symlink — OpenDeck's PI server doesn't follow symlinks pointing outside the plugins directory. The dev folder can be named anything.

## Usage

1. Drag the **Weather** action onto a key
2. Open the Property Inspector (settings panel)
3. Enter your [OpenWeatherMap API key](https://home.openweathermap.org/api_keys)
4. Enter a city name (e.g. `London`, `New York,US`, `Tokyo`)
5. Choose units: Metric (°C), Imperial (°F), or Standard (K)
6. Pick a display style and refresh interval
7. Click **Save Settings**

### Display Styles

| Style | Preview | Description |
|-------|---------|-------------|
| **Icon** | ☀ 24°C | Weather icon with optional temperature below |
| **Text** | 24° | Large temperature with city name |

### Day/Night Colors

- **Day**: Light gray/slate backgrounds with dark text and icons
- **Night**: Dark backgrounds with white text and icons

## Development

```bash
npm start        # Run the plugin (OpenDeck will launch it)
npm run sync     # Rsync this folder into the OpenDeck install dir
npm run log      # Tail the installed plugin.log for debugging
npm run clean    # Remove node_modules for clean reinstall
```

Edit files in this folder, run `npm run sync`, then restart OpenDeck (only needed for `index.js` changes — PI HTML reloads on its own when reopened).

The plugin listens on a WebSocket at `ws://127.0.0.1:<port>` and communicates using the OpenDeck/Stream Deck protocol.

### Project Structure

```
.
├── index.js           # Main plugin (CommonJS)
├── manifest.json      # Plugin manifest
├── pi/
│   └── index.html     # Property Inspector settings UI
├── icons/
│   ├── plugin.svg     # Plugin listing icon
│   ├── action.svg     # Action listing icon
│   ├── sun.png        # Phosphor-style weather icons
│   ├── moon-stars.png
│   ├── cloud.png
│   ├── cloud-sun.png
│   ├── cloud-moon.png
│   ├── cloud-rain.png
│   ├── cloud-snow.png
│   ├── cloud-lightning.png
│   └── cloud-fog.png
├── .gitignore
├── .editorconfig
├── .env.example
├── AGENTS.md
└── package.json
```

## Configuration

All settings are configured per-action via the Property Inspector. No manual config files needed.

| Setting | Description | Default |
|---------|-------------|---------|
| API Key | OpenWeatherMap API key | — |
| City | City name (e.g. `London,UK`) | — |
| Units | `metric`, `imperial`, or `standard` | metric |
| Style | `icon` or `text` | icon |
| Show Temp | Show temperature below icon (icon style only) | enabled |
| Refresh Interval | Seconds between refreshes (min 30) | 3600 (1 hour) |

## License

MIT
