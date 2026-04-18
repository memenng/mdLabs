# mdLabs

Lightweight read-only Markdown reader for macOS, Windows, and Linux.

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
- Icon generation: `qlmanage -t -s 1024` for SVG→PNG, `sips` for resize, `iconutil -c icns` for .icns
- Windows `.ico`: use `npx png-to-ico src-tauri/icons/32x32.png > src-tauri/icons/icon.ico` — must redirect stdout to file, not pipe (npm warnings corrupt the binary)
- Cannot cross-compile Tauri — must build on each target OS (use GitHub Actions CI)

## Auto-updater

- Plugin: `tauri-plugin-updater` + `tauri-plugin-process` (for relaunch)
- Signing key: `~/.tauri/mdlabs.key` (private, keep safe) / `~/.tauri/mdlabs.key.pub` (public, in tauri.conf.json)
- Endpoint (placeholder): `https://updates.mdlabs.example.com/{{target}}/{{arch}}/{{current_version}}` — swap with real VPS URL when ready
- UI: Info icon shows orange dot badge when update available → click opens `UpdateDialog` with changelog + progress bar → auto-relaunch after install
- Hook: `src/hooks/useUpdater.ts` (checks on startup)
- CI env vars needed as GitHub Secrets: `TAURI_SIGNING_PRIVATE_KEY` (content of `~/.tauri/mdlabs.key`), optionally `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- VPS serves `latest.json` manifest — tauri-action generates it automatically on release

## CI/CD

- GitHub Actions workflow at `.github/workflows/build.yml`
- Triggered by version tags (`git tag v1.x.x && git push origin v1.x.x`) or manual dispatch
- Builds 4 targets: macOS arm64, macOS x64, Windows x64, Linux x64
- Artifacts published to GitHub Releases automatically
- Workflow requires `permissions: contents: write` for creating releases
- Repo: `github.com/memenng/mdLabs` (private)

## Icons

- `src-tauri/icons/mdlabs-icon.svg` — source SVG (flask silhouette, orange on dark)
- `src-tauri/icons/mdlabs.icns` — macOS
- `src-tauri/icons/icon.ico` — Windows
- `src-tauri/icons/icon.png` — Linux/fallback (1024x1024)
- Generate from SVG: `qlmanage -t -s 1024` → `sips` resize → `iconutil -c icns`

## Code Style

- Components in `src/components/`, hooks in `src/hooks/`, types in `src/types/`
- All components support light/dark theme via `dark:` Tailwind classes
- Orange accent color: `orange-400` (dark) / `orange-500` (light)
