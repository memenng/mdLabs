# mdLabs

Lightweight read-only Markdown reader for macOS.

## Tech Stack

- **Runtime:** Tauri v2 (Rust backend)
- **Frontend:** React 19 + Vite + TypeScript
- **Styling:** TailwindCSS 4 + @tailwindcss/typography
- **Animations:** `motion` package (`import from "motion/react"`, NOT framer-motion)
- **MD Rendering:** react-markdown + remark-gfm + remark-math + rehype-katex + rehype-highlight + mermaid

## Architecture Decisions

- Filesystem access uses **custom Rust commands** (`read_directory`, `read_md_file`) via `invoke()` — NOT `tauri-plugin-fs` (scope system too restrictive for reading arbitrary paths)
- Theme switching uses TailwindCSS `dark:` variant with class-based toggle on `<html>`
- highlight.js light mode uses explicit `:root:not(.dark)` CSS overrides (CSS layers don't work reliably)

## Build Commands

- `npm run dev` — Start Vite dev server
- `npx tauri dev` — Dev mode with hot reload (requires Rust toolchain)
- `npx tauri build` — Production build → `src-tauri/target/release/bundle/macos/mdLabs.app`

## Gotchas

- `create-tauri-app` and `tauri init` require interactive terminal — scaffold manually in Claude Code
- `tauri.conf.json`: no `app.title` field in Tauri v2 — use `productName` and window `title` only
- Tauri v2 `readDir` has no `recursive` option — use custom Rust command instead
- macOS icon generation: `qlmanage -t -s 1024` for SVG→PNG, `sips` for resize, `iconutil -c icns` for .icns

## Code Style

- Components in `src/components/`, hooks in `src/hooks/`, types in `src/types/`
- All components support light/dark theme via `dark:` Tailwind classes
- Orange accent color: `orange-400` (dark) / `orange-500` (light)
