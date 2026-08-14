# ◐ Nebula OS — an operating system in your browser

A full-featured mini-OS built with **pure HTML, CSS and JavaScript** — not a single
external library, framework or CDN. Everything runs locally and offline.

![stack](https://img.shields.io/badge/stack-html%20%7C%20css%20%7C%20js-orange)

## 🚀 Getting started

The simplest way is to double-click `index.html`.

Or spin up a local server:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## ✨ Features

| Module | Description |
|---|---|
| **Window manager** | Drag windows by their header (windows can't be "lost" off-screen), z-index focus, macOS-style traffic-light controls (close / minimize / maximize, symbols appear on hover), resize via 8 handles (edges and corners), smart non-overlapping placement (grid search + cascade fallback), double-click a header to maximize |
| **Menu bar** | macOS-style global menu bar at the top: ◐ logo, the name of the focused app, and two dropdown menus — **Apps** (launch anything) and **System** (About, Settings, Sleep, Reboot) |
| **Start menu** | ◐ button in the dock: user card, live stats (windows, theme, wallpaper, uptime, memory), Launchpad-style app grid with colorful squircle tiles, "Reboot OS" |
| **System tray** | Wi-Fi (simulated), volume with popup and sound test, fullscreen mode, live clock and date |
| **Desktop** | App icons: single click — select, double click — open (keyboard: Enter/Space). Live background — canvas particles with parallax following the cursor |
| **UI sounds** | Web Audio API: short blips on open/close/click, master volume and mute (survive reboot) |
| **📝 Notes** | Autosave to `localStorage`, title, "Saved HH:MM:SS" indicator, clear |
| **📁 Files** | Virtual file system in `localStorage`: folders and files, breadcrumbs, navigation (back / forward / up), rename, delete, download, built-in text editor (Ctrl+S), grid / list views |
| **💻 Terminal** | Commands: `help`, `clear`, `date`, `echo`, `theme [dark\|neon\|cyberpunk]`, `matrix`, `ls [path]`, `cat`, `mkdir`, `touch`, `rm`, `open`, `whoami`, `neofetch`, `about`. Command history (↑/↓ arrows) |
| **🧮 Calculator** | Basic operations, `%`, `±`, keyboard support |
| **🌐 Browser** | Tabs, address bar with search detection (DuckDuckGo), bookmarks and history in `localStorage`, start page with quick links and favorite apps, back/forward/reload/home buttons, hotkeys Ctrl+L/T/W, dark page theme (color inversion in the iframe), internal pages `nebula://home`, `nebula://apps` (app launcher with search, categories, favorites and keyboard navigation: arrows, Home/End, Enter; category and search persist between visits), `nebula://about` (about the system with live stats, an SVG CPU load chart with average/max stats, quick theme switches, sleep mode with screen dimming, a summary of missed events (with names) when waking up, and a reboot button), `nebula://settings` (quick themes and wallpapers), `nebula://tray` (sound and Wi-Fi synced with the tray), `nebula://bookmarks`, `nebula://history` and file-system browsing at `nebula://vfs/path` (folder listing, breadcrumbs, file reading and download, 404 page). External pages open **inside the app**: sites that allow embedding load in the iframe, and sites that block it can be read in **text mode** (rendered in-app via a text proxy) or opened in a new internal tab — the app never bounces you out to an external browser |
| **🎵 Music** | Procedural lo-fi generator on the Web Audio API — not a single audio file: bass, pad chords and a pentatonic melody are synthesized in real time. Playlist, equalizer, progress, button click sound effects (play/pause, next/previous, track) and its own button-sound toggle 🔊/🔇 in the app header (saved to `localStorage`, doesn't affect the music) |
| **❌ Tic-Tac-Toe** | Classic game in a window with difficulty selection: 🤖 easy bot (win → block → center → random move), 🧠 unbeatable bot (minimax — explores every option, guaranteed not to lose) or 👥 two players at one table. Win/draw score, "Restart" |
| **🐍 Snake** | Classic arcade on canvas: arrows or WASD, pause with Space, score and a best record saved to `localStorage` |
| **💣 Minesweeper** | Classic minefield with three difficulties (easy 9×9/10, medium 16×16/40, hard 30×16/99), left-click to reveal, right-click to flag, timer, first click is always safe, win/lose detection |
| **🎨 Paint** | Drawing canvas: 10-color palette, brush size slider, eraser, clear, save as PNG |
| **🔢 2048** | The famous puzzle on arrow keys / WASD: score, best record in `localStorage`, win banner at 2048, new game |
| **🕹️ Pong** | Arcade vs. the bot on canvas: mouse or W/S for the player paddle, first to 7, ball physics with angle reflections |
| **✏️ Editor** | Text editor that saves straight into the virtual file system: open files from `/home/guest`, Ctrl+S to save, live line/character counter |
| **🖼️ Wallpapers** | A personalization app of its own: 7 wallpapers with large previews, instant background change saved to `localStorage`. New wallpapers have live effects: "Space" — twinkling stars, "Cyberpunk" — a running neon grid with pulsing orbs and light glints, "Nature" — falling leaves |
| **📅 Calendar** | Monthly grid, today highlighted, events with times in `localStorage`, add/delete |
| **🎨 Settings** | Switch between 5 themes (Night / Neon / Cyberpunk / Glass / Light) and 7 wallpapers (Aurora, Sunset, Ocean, Monochrome, Space, Cyberpunk, Nature), reset settings |
| **🌐 4 languages** | Russian 🇷🇺, English 🇬🇧, Kyrgyz 🇰🇬 and 中文 🇨🇳 — the whole OS (desktop, dock, Start menu, right-click menu, tray, every app and notification) switches on the fly from Settings and right on the boot screen, saved to `localStorage` |
| **Context menu** | Right-click the desktop: quick app launch, wallpaper change, reboot |

## 🎨 Design

- Glassmorphism: translucent glass, `backdrop-filter: blur`, soft shadows
- Animated gradient background (live blurred blobs) + canvas particles with parallax
- Smooth window/dock entrance animations, bouncy hover effects, sound feedback
- OS boot screen at startup (skippable by clicking), reboot via Start
- Its own style — a deliberate alternative to Windows/macOS

## 🗂 Structure

```
webos/
├── index.html   — desktop markup (Start, tray, windows)
├── style.css    — themes, wallpapers, glassmorphism, animations, apps
├── script.js    — window manager, dock, tray, Start, apps (modular, commented)
└── webos.html   — the same OS as a single self-contained file
```

## 💾 State

Settings and data are kept in `localStorage` and survive reloads:

- `nebula.lang` — UI language (ru / en / ky / zh)
- `nebula.theme` / `nebula.wallpaper` — look and feel
- `nebula.volume` / `nebula.muted` — sound
- `nebula.notes` — note contents
- `nebula.events` — calendar events
- `nebula.browserBookmarks` / `nebula.browserHistory` — browser bookmarks and history
- `nebula.browserDark` — browser page dark theme
- `nebula.browserFavApps` — favorite apps in the browser
- `nebula.browserAppsCat` / `nebula.browserAppsQ` — launcher category and search
- `nebula.wifi` — Wi-Fi state (synced with the tray)
- `nebula.fs` — the virtual file system
- `nebula.filesCwd` / `nebula.filesView` — last directory and view of the Files app
- `nebula.notifs` — notification history
- `nebula.snakeBest` / `nebula.g2048Best` — Snake and 2048 high scores

## 🧪 Tests

Headless jsdom suite (`node .ui-test.js`): window manager, terminal, files,
notifications, Start, tray, calendar, music, browser, VFS browser, dark theme,
app launcher, search, categories, favorites, keyboard navigation, launcher state
persistence, "About" page (SVG CPU chart, quick themes, sleep mode with a missed-events
summary, reboot), "Settings" and "Tray" (sound and Wi-Fi), tic-tac-toe (bot and two
players, win, score), Wallpapers app (instant background change), minesweeper bot
difficulty in tic-tac-toe (easy bot loses to a fork, the unbeatable bot draws against
optimal X), the button-sound toggle in Music, live wallpaper effects (stars, neon
grid, leaves), localization (4 languages, switching on the fly, saving and applying
after reboot, language choice on the boot screen), and the six newapps (Snake, Minesweeper, Paint, 2048, Pong and the Editor with VFS saves), and the macOS-style menu bar (dropdowns, focused-app title, Esc to close) — **406 checks**.

```bash
node .ui-test.js
```

## 📜 License

Public access, no authorization. Take it, modify it, be inspired.
