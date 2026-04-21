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
- **Signed build (for updater artifacts):**
  ```
  TAURI_SIGNING_PRIVATE_KEY=$(cat ~/.tauri/mdlabs.key) TAURI_SIGNING_PRIVATE_KEY_PASSWORD="" npx tauri build
  ```
  Produces `mdLabs.app.tar.gz` + `.tar.gz.sig` for updater distribution.

## Versioning

Bump version in **3 places together** (they must match):
- `src-tauri/tauri.conf.json` → `version`
- `package.json` → `version`
- `src-tauri/Cargo.toml` → `version`

Do NOT hardcode version strings in UI — read via `getVersion()` from `@tauri-apps/api/app`.

## Gotchas

- `create-tauri-app` and `tauri init` require interactive terminal — scaffold manually in Claude Code
- `tauri.conf.json`: no `app.title` field in Tauri v2 — use `productName` and window `title` only
- Tauri v2 `readDir` has no `recursive` option — use custom Rust command instead
- Icon generation: `qlmanage -t -s 1024` for SVG→PNG, `sips` for resize, `iconutil -c icns` for .icns
- Windows `.ico`: use `npx png-to-ico src-tauri/icons/32x32.png > src-tauri/icons/icon.ico` — must redirect stdout to file, not pipe (npm warnings corrupt the binary)
- Cannot cross-compile Tauri — must build on each target OS (use GitHub Actions CI)
- Overlays that must stay visible while `<main>` scrolls (FindBar, reading progress, word counter) MUST use `position: fixed` — `absolute` inside `<main>` scrolls with the content. Anchor to viewport with `top-12` (below the 48px header) / `bottom-2` etc.
- `bundle.targets` does NOT accept `"updater"` as an entry (unknown variant error). Use `"targets": "all"` + `createUpdaterArtifacts: true` to produce updater bundles.
- Updater ships **two artifacts per platform**: `*.tar.gz` (macOS) or `*.msi.zip` (Windows) plus a `.sig` sidecar — both must be uploaded to the update server.

## Auto-updater

- Plugin: `tauri-plugin-updater` + `tauri-plugin-process` (for relaunch)
- Signing key: `~/.tauri/mdlabs.key` (private, keep safe) / `~/.tauri/mdlabs.key.pub` (public, in tauri.conf.json)
- Endpoint (placeholder): `https://updates.mdlabs.example.com/{{target}}/{{arch}}/{{current_version}}` — swap with real VPS URL when ready
- UI: Info icon shows orange dot badge when update available → click opens `UpdateDialog` with changelog + progress bar → auto-relaunch after install
- Hook: `src/hooks/useUpdater.ts` (checks on startup)
- Permissions required in `capabilities/default.json`: `updater:default`, `process:default`, `process:allow-restart`
- If endpoint is unreachable (e.g. placeholder URL), updater fails silently — `status.kind === "error"`, no badge shown, app keeps working
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

## Settings & State

- `tauri-plugin-store` persists user settings to `settings.json` via `src/hooks/useAppSettings.ts`
- Persisted keys: `sidebarOpen`, `openFolders` (multi-root), `lastFolder` (legacy, used only for migration), `recentFolders` (max 8), `zoom` (0.7–2)
- All previously-opened folders auto-restore on app start

## Search

- **In-file (Cmd+F):** `src/hooks/useInFileSearch.ts` walks text nodes in the viewer and uses the CSS Custom Highlight API (`CSS.highlights`) for match styling — no DOM mutation. FindBar UI in `src/components/FindBar.tsx`.
- **Global search:** Rust command `search_directory(path, query)` in `src-tauri/src/lib.rs` walks `.md` files under a folder (skips dotfiles), caps at 20 matches/file and 200 files. UI in `src/components/GlobalSearch.tsx` with a tabbed Sidebar.

## TOC / Outline

- Headings extracted in TS via regex (code fences skipped) in `TocPanel.tsx`
- `rehype-slug` assigns matching heading IDs during rendering
- Active heading detection via scroll listener on the viewer scroll container

## Keyboard Shortcuts

Hotkeys via `src/hooks/useHotkeys.ts` (`Cmd`/`Ctrl` = "mod"):
- `mod+f` find-in-file · `mod+o` open folder · `mod+b` toggle sidebar
- `mod+=` / `mod+-` zoom · `mod+0` reset zoom · `esc` close find bar

## File Tree Behavior

- Multiple folders can be opened side-by-side — each appears as its own collapsed root node
- "Open Folder" button adds a folder (doesn't replace). Dropping a folder also adds.
- Root folder nodes show an × button on hover → triggers a confirmation modal (`ConfirmDialog`) before removing from navigation. Removing does not touch the folder on disk.
- All folders default to collapsed; filter-matching forces display but doesn't auto-expand
- Refresh: manual button in Sidebar + auto-refresh on `window` focus event — refreshes all open roots

## Code Style

- Components in `src/components/`, hooks in `src/hooks/`, types in `src/types/`
- All components support light/dark theme via `dark:` Tailwind classes
- Orange accent color: `orange-400` (dark) / `orange-500` (light)
