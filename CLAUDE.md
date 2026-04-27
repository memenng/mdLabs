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
- Tauri v2 backend state: register with `.manage(Mutex::new(T))` in the builder, consume in commands as `State<'_, Mutex<T>>`. Emit events via `use tauri::Emitter; app.emit("event-name", payload)`. Path helpers (`app.path().app_log_dir()`) need `use tauri::Manager`.
- Bundle splitting: `MarkdownViewer` pulls in react-markdown + katex + highlight.js + mermaid. It's wrapped in `React.lazy` in `App.tsx`, and `MermaidBlock` dynamic-imports mermaid inside `useEffect` (cached promise). Don't static-import these back — keeps main chunk ~258KB (gzip 77KB) vs 760KB/237KB if inlined.

## Build Commands

- `npm run dev` — Start Vite dev server
- `npx tauri dev` — Dev mode with hot reload (requires Rust toolchain)
- `npx tauri build` — Production build → `src-tauri/target/release/bundle/macos/mdLabs.app`
- **Signed build (for updater artifacts):**
  ```
  TAURI_SIGNING_PRIVATE_KEY=$(cat ~/.tauri/mdlabs.key) TAURI_SIGNING_PRIVATE_KEY_PASSWORD="" npx tauri build
  ```
  Produces `mdLabs.app.tar.gz` + `.tar.gz.sig` for updater distribution.
- **Local Mac install over existing app (skip CI):**
  ```
  pkill -f "mdLabs.app/Contents/MacOS/mdlabs"; rm -rf /Applications/mdLabs.app; \
  cp -R src-tauri/target/release/bundle/macos/mdLabs.app /Applications/; \
  xattr -dr com.apple.quarantine /Applications/mdLabs.app
  ```
  Quarantine strip needed because local builds aren't notarized.

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
- Windows icon source is `mdlabs-icon-win.svg` (full-bleed, no 32px transparent padding). The macOS `mdlabs-icon.svg` keeps the padding for Apple's safe area; using it for `.ico` makes Windows show a visible transparent/white border around the rounded square. Regenerate `.ico` by rendering the `-win` SVG to multiple PNG sizes (16/24/32/48/64/128/256) and feeding them all to `png-to-ico` for crisp rendering at every Windows icon size.
- Cannot cross-compile Tauri — must build on each target OS (use GitHub Actions CI)
- Overlays that must stay visible while `<main>` scrolls (FindBar, reading progress, word counter) MUST use `position: fixed` — `absolute` inside `<main>` scrolls with the content. Anchor to viewport with `top-12` (below the 48px header) / `bottom-2` etc.
- `bundle.targets` does NOT accept `"updater"` as an entry (unknown variant error). Use `"targets": "all"` + `createUpdaterArtifacts: true` to produce updater bundles.
- Updater ships **two artifacts per platform**: `*.tar.gz` (macOS) or `*.msi.zip` (Windows) plus a `.sig` sidecar — both must be uploaded to the update server.
- CI matrix sometimes fails one platform with "Not Found - update-a-release-asset" (race on GH Release asset upload). Fix: `gh run rerun <id> --failed` — no code change.
- Tauri command params: Rust `snake_case` is auto-converted to JS `camelCase` on `invoke` (e.g. `case_sensitive: Option<bool>` → call with `{ caseSensitive: true }`). Adding a new param as `Option<T>` keeps old callers working.
- `React.lazy(() => import("./Foo"))` requires the module to have a default export. `forwardRef` components work under `React.lazy` in React 19 (ref is forwarded through `<Suspense>`).
- Force `tauri dev` to rebuild Rust after editing `Cargo.toml`: `touch src-tauri/src/lib.rs`. The watcher is on `src/`, not `Cargo.toml`.
- `motion` gesture props (`whileTap`, `whileHover`) only fire on the element they're attached to — a `motion.span` child of a `motion.button` does NOT receive the parent's tap. To animate a child (e.g. spin only the icon, not the whole button box), use a state counter incremented on click + `animate={{ rotate: counter * 360 }}` on the child, not `whileTap` on the child.

## Auto-updater

- Plugin: `tauri-plugin-updater` + `tauri-plugin-process` (for relaunch)
- Signing key: `~/.tauri/mdlabs.key` (private, keep safe) / `~/.tauri/mdlabs.key.pub` (public, in tauri.conf.json)
- Endpoint: `https://github.com/memenng/mdLabs/releases/latest/download/latest.json` — works because repo is public; `tauri-action` uploads `latest.json` to each release automatically. No VPS required. If repo ever goes private, this URL will start 404'ing for unauthenticated clients — switch to a VPS-hosted manifest at that point.
- UI: Info icon shows orange dot badge when update available → click opens `UpdateDialog` with changelog + progress bar → auto-relaunch after install
- Hook: `src/hooks/useUpdater.ts` (checks on startup)
- Permissions required in `capabilities/default.json`: `updater:default`, `process:default`, `process:allow-restart`
- If endpoint is unreachable, updater fails silently — `status.kind === "error"`, no badge shown, app keeps working
- CI env vars needed as GitHub Secrets: `TAURI_SIGNING_PRIVATE_KEY` (content of `~/.tauri/mdlabs.key`), optionally `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

## CI/CD

- GitHub Actions workflow at `.github/workflows/build.yml`
- Triggered by version tags (`git tag v1.x.x && git push origin v1.x.x`) or manual dispatch
- **CI builds macOS arm64 + Windows x64.** Repo is public, so Actions minutes are unlimited and free. Linux is intentionally skipped — nobody uses it. macOS x64 (Intel) is dropped because it's end-of-life; only `aarch64-apple-darwin` is built.
- Artifacts published to GitHub Releases automatically (`*.app.tar.gz` + `.sig` for macOS, `*.msi.zip` + `.sig` for Windows). The same release also contains `latest.json` which the in-app updater fetches.
- Workflow requires `permissions: contents: write` for creating releases
- Repo: `github.com/memenng/mdLabs` (public, AGPL-3.0)

## Icons

- `src-tauri/icons/mdlabs-icon.svg` — source SVG (flask silhouette, orange on dark)
- `src-tauri/icons/mdlabs.icns` — macOS
- `src-tauri/icons/icon.ico` — Windows
- `src-tauri/icons/icon.png` — Linux/fallback (1024x1024)
- Generate from SVG: `qlmanage -t -s 1024` → `sips` resize → `iconutil -c icns`

## Settings & State

- Adding a new field: add it to both the `AppSettings` interface and `DEFAULTS` — the load loop merges stored values over defaults, so pure additions need no migration. For large `Record<path, …>` fields (e.g. `scrollPositions`), enforce an LRU cap and prefer keeping keys referenced by `recentFiles`/`pinnedFiles` during eviction.
- `tauri-plugin-store` persists user settings to `settings.json` via `src/hooks/useAppSettings.ts`
- Persisted keys: `sidebarOpen`, `openFolders` (multi-root), `lastFolder` (legacy, used only for migration), `recentFolders` (max 8), `zoom` (0.7–2)
- All previously-opened folders auto-restore on app start

## Search

- **In-file (Cmd+F):** `src/hooks/useInFileSearch.ts` walks text nodes in the viewer and uses the CSS Custom Highlight API (`CSS.highlights`) for match styling — no DOM mutation. FindBar UI in `src/components/FindBar.tsx`.
- **Global search:** Rust command `search_directory(path, query)` in `src-tauri/src/lib.rs` walks `.md` files under a folder (skips dotfiles), caps at 20 matches/file and 200 files. UI in `src/components/GlobalSearch.tsx` fans out across all open roots in parallel and de-duplicates results by path.

## TOC / Outline

- Headings extracted in TS via regex (code fences skipped) in `TocPanel.tsx`
- `rehype-slug` assigns matching heading IDs during rendering
- Active heading detection via scroll listener on the viewer scroll container

## Keyboard Shortcuts

Hotkeys via `src/hooks/useHotkeys.ts` (`Cmd`/`Ctrl` = "mod"):
- `mod+f` find-in-file · `mod+o` open folder · `mod+b` toggle sidebar
- `mod+=` / `mod+-` zoom · `mod+0` reset zoom · `esc` close find bar

## File Watching

- `watch_folder` Rust command (in `src-tauri/src/lib.rs`) uses `notify_debouncer_mini` with 500ms debounce, emits `folder-changed` event with `Vec<String>` payload of changed paths.
- `src/hooks/useFolderWatcher.ts` passes the payload array to its `onChanged` callback — consumer decides what to do per path.
- In `App.tsx`, the handler both refreshes the folder tree AND re-reads the currently-open file if its path is in the payload (via `openFile(selectedPath, { restoreScroll: true })`). Scroll position is preserved because `openFile` saves current scroll before re-reading, and `restoreScroll` pulls it back.
- Do NOT add a separate file-content watcher — the folder watcher is recursive and already covers file-level events.

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
- Destructive user actions use the custom `ConfirmDialog` (Yes/No modal) rather than native `ask()` dialogs — keeps theming consistent.
