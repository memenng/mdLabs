# mdLabs

A lightweight, read-only Markdown reader for macOS, Windows, and Linux.

Built with Tauri + React. No editor, no clutter — just a fast, focused reader for your `.md` files.

## Features

- Open one or many folders side-by-side
- Live folder watcher — files reload as you save them in your editor
- GitHub-flavored Markdown, math (KaTeX), syntax highlighting, and Mermaid diagrams
- In-file find (`⌘F`) and global multi-folder search
- Outline / TOC with active heading tracking
- Reading progress, word count, zoom, and dark mode
- Keyboard-first navigation
- Auto-update on Windows and macOS

## Install

Download the latest release for your platform from the [Releases page](https://github.com/memenng/mdLabs/releases/latest):

- **macOS (Apple Silicon):** `mdLabs_x.x.x_aarch64.dmg`
- **Windows:** `mdLabs_x.x.x_x64-setup.exe`
- **Linux:** `mdLabs_x.x.x_amd64.AppImage`

## Build from source

Requires Node 22+ and the Rust toolchain.

```bash
npm install
npx tauri dev      # development
npx tauri build    # production build
```

Production binaries land in `src-tauri/target/release/bundle/`.

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Find in file | `⌘F` / `Ctrl+F` |
| Open folder | `⌘O` / `Ctrl+O` |
| Toggle sidebar | `⌘B` / `Ctrl+B` |
| Zoom in / out | `⌘=` / `⌘-` |
| Reset zoom | `⌘0` |
| Close find bar | `Esc` |

## Tech stack

Tauri v2 · React 19 · Vite · TailwindCSS 4 · TypeScript · Rust

## License

[AGPL-3.0-only](LICENSE) © SoapTrader

This is copyleft software — if you modify and distribute mdLabs (or run a modified version as a network service), you must release your changes under the same license.
