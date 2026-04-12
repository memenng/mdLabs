# mdLabs — Lightweight Markdown Reader for macOS

## Overview

mdLabs is a lightweight, native macOS application for reading Markdown files. Built with Tauri v2 + React, it serves as a fast, minimal alternative to Obsidian for users who only need to view `.md` files with rich rendering (diagrams, code, math, tables, images).

**Core principle:** Read-only, offline, no database, no network. Just open and read.

## Architecture

```
┌─────────────────────────────────────┐
│           Tauri v2 (Rust)           │
│  - File system access (read only)   │
│  - Folder watching (auto refresh)   │
│  - Native file/folder dialog        │
│  - Window management                │
└──────────────┬──────────────────────┘
               │ IPC (invoke commands)
┌──────────────▼──────────────────────┐
│       React 19 + Vite 6 (Frontend) │
│                                     │
│  ┌──────────┐  ┌──────────────────┐ │
│  │ Sidebar  │  │  MD Viewer       │ │
│  │ - Tree   │  │  - react-markdown│ │
│  │ - Search │  │  - mermaid       │ │
│  │          │  │  - katex         │ │
│  │          │  │  - highlight.js  │ │
│  │          │  │  - GFM tables    │ │
│  └──────────┘  └──────────────────┘ │
│         TailwindCSS 4 + Themes      │
└─────────────────────────────────────┘
```

## UI Layout

Two-panel layout:
- **Sidebar (250px, resizable):** file tree with search filter, open folder button
- **Content Viewer:** rendered markdown with full feature support
- **Header:** app title, theme toggle (dark/light), sidebar toggle

## Features

| Feature | Detail |
|---------|--------|
| Open File | Drag & drop or native file picker, open `.md` directly |
| Open Folder | Native folder picker, display file tree in sidebar |
| File Tree | Expand/collapse folders, file/folder icons, click to open |
| Search | Filter files by name in sidebar |
| Mermaid Diagrams | Render flowchart, sequence, gantt, pie, etc. |
| Code Blocks | Syntax highlighting (highlight.js) + copy button |
| LaTeX/Math | Inline `$x^2$` and block `$$\sum$$` via KaTeX |
| GFM Tables | Styled tables with borders and alternating rows |
| Images | Render relative and absolute path images |
| Dark/Light Theme | Toggle in header, system preference default |
| Sidebar Toggle | Hide/show sidebar for distraction-free reading |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Tauri v2 |
| Frontend | React 19 |
| Bundler | Vite 6 |
| Styling | TailwindCSS 4 |
| MD Rendering | react-markdown |
| GFM | remark-gfm |
| Diagrams | mermaid |
| Code Highlight | rehype-highlight + highlight.js |
| Math | rehype-katex + remark-math |
| Icons | lucide-react |
| Language | TypeScript 5+ |

## Tauri Commands (Rust Backend)

Four IPC commands exposed to the frontend:

```
read_file(path: String) → String              // Read MD file content
read_dir(path: String) → Vec<FileEntry>       // Read directory tree (recursive)
open_file_dialog() → Option<String>           // Native file picker (.md filter)
open_dir_dialog() → Option<String>            // Native folder picker
```

### FileEntry struct

```rust
struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    children: Option<Vec<FileEntry>>,
}
```

## What This App Does NOT Do

- No editing / saving files
- No database or local storage (beyond window state)
- No network calls or auto-update
- No plugin system
- No wikilinks or backlinks (read standard markdown only)

## About Dialog

The app includes an About window accessible from the menu bar (mdLabs > About mdLabs). It displays:

- **App icon** (mdLabs logo)
- **App name:** mdLabs
- **Tagline:** "A lightweight Markdown reader for macOS"
- **Version:** 1.0.0
- **Year:** 2026
- **Author:** mmnLabs

### Key info shown in About:

> **Read-only viewer** — mdLabs does not edit, modify, or save files. Your documents are never changed.
>
> **Fully offline** — No internet connection required. No data is sent anywhere.
>
> **No database** — Files are read directly from your filesystem. Nothing is stored or indexed.
>
> **Open any .md file** — Drag & drop, open from file picker, or browse folders.

### Supported rendering:

- Markdown with GFM (tables, strikethrough, task lists)
- Mermaid diagrams
- Syntax-highlighted code blocks
- LaTeX / KaTeX math equations
- Embedded images

## App Icon

- **Concept:** Document + Lab Flask (markdown + Labs)
- **Colors:** Dark background (#1a1a2e), BLUM-inspired orange accent (#FF8C00 → #FFB347)
- **Style:** macOS rounded square, minimal, geometric
- **File:** `src-tauri/icons/mdlabs-icon.svg`

## Target

- **Platform:** macOS (Apple Silicon + Intel)
- **App size:** ~10-15MB
- **Install:** `.app` bundle, no App Store required
