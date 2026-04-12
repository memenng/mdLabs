# mdLabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight, read-only Markdown reader for macOS using Tauri v2 + React + Vite

**Architecture:** Tauri v2 Rust backend handles filesystem access (read files, read directories, native dialogs). React 19 frontend renders markdown with react-markdown and plugins for GFM, Mermaid, KaTeX, and syntax highlighting. Two-panel layout: sidebar file tree + content viewer.

**Tech Stack:** Tauri v2, React 19, Vite 6, TypeScript, TailwindCSS 4, react-markdown, remark-gfm, remark-math, rehype-katex, rehype-highlight, mermaid, lucide-react

---

## File Structure

```
mdLabs/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json
│   ├── icons/
│   │   └── mdlabs-icon.svg          (already exists)
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs
│   └── build.rs
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── FileTree.tsx
│   │   ├── MarkdownViewer.tsx
│   │   ├── MermaidBlock.tsx
│   │   ├── CodeBlock.tsx
│   │   ├── AboutDialog.tsx
│   │   └── ThemeToggle.tsx
│   ├── hooks/
│   │   └── useTheme.ts
│   └── types/
│       └── files.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts (not needed for TailwindCSS 4 — uses CSS-based config)
```

---

### Task 1: Scaffold Tauri + React + Vite Project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`, `src-tauri/build.rs`
- Create: `src-tauri/capabilities/default.json`

- [ ] **Step 1: Create the Tauri + React project**

Run:
```bash
cd /Users/memen/Documents/mmnLabs
npm create tauri-app@latest mdLabs -- --template react-ts --manager npm
```

When prompted, select:
- Package manager: npm
- Frontend: React
- Language: TypeScript

Expected: A `mdLabs` directory with full Tauri + React + Vite scaffold. Since the directory already exists with our docs and icons, we may need to merge. If the CLI refuses because the dir exists, create in a temp name and move files.

- [ ] **Step 2: Install Tauri plugins (dialog + fs)**

```bash
cd /Users/memen/Documents/mmnLabs/mdLabs
npm install @tauri-apps/plugin-dialog @tauri-apps/plugin-fs
```

Then add Rust dependencies in `src-tauri/Cargo.toml` under `[dependencies]`:

```toml
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
```

- [ ] **Step 3: Install frontend dependencies**

```bash
npm install react-markdown remark-gfm remark-math rehype-katex rehype-highlight mermaid lucide-react
npm install -D @tailwindcss/vite tailwindcss
```

- [ ] **Step 4: Configure TailwindCSS 4 in Vite**

In `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
```

In `src/index.css` (replace all content):

```css
@import "tailwindcss";
@import "katex/dist/katex.min.css";
@import "highlight.js/styles/github-dark.min.css";
```

- [ ] **Step 5: Configure Tauri capabilities for filesystem and dialog**

Create `src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:default",
    "dialog:allow-open",
    "fs:default",
    "fs:allow-read-text-file",
    "fs:read-all"
  ]
}
```

- [ ] **Step 6: Register plugins in Rust backend**

In `src-tauri/src/lib.rs`:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 7: Configure tauri.conf.json**

Update `src-tauri/tauri.conf.json` — set app name, window config:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "mdLabs",
  "version": "1.0.0",
  "identifier": "com.mmnlabs.mdlabs",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "title": "mdLabs",
    "windows": [
      {
        "label": "main",
        "title": "mdLabs",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "decorations": true,
        "fileDropEnabled": true
      }
    ]
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/mdlabs-icon.svg"
    ]
  }
}
```

- [ ] **Step 8: Verify scaffold builds**

```bash
cd /Users/memen/Documents/mmnLabs/mdLabs
npm run tauri dev
```

Expected: A Tauri window opens showing the default React page. Close the window.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Tauri v2 + React + Vite project with plugins"
```

---

### Task 2: Types and Theme Hook

**Files:**
- Create: `src/types/files.ts`
- Create: `src/hooks/useTheme.ts`

- [ ] **Step 1: Create file types**

Create `src/types/files.ts`:

```typescript
export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileEntry[];
}
```

- [ ] **Step 2: Create theme hook**

Create `src/hooks/useTheme.ts`:

```typescript
import { useState, useEffect } from "react";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggleTheme };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/files.ts src/hooks/useTheme.ts
git commit -m "feat: add file types and theme hook"
```

---

### Task 3: Sidebar and FileTree Components

**Files:**
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/FileTree.tsx`

- [ ] **Step 1: Create FileTree component**

Create `src/components/FileTree.tsx`:

```tsx
import { useState } from "react";
import { ChevronRight, ChevronDown, File, Folder } from "lucide-react";
import { FileEntry } from "../types/files";

interface FileTreeProps {
  entries: FileEntry[];
  onFileSelect: (path: string) => void;
  selectedPath: string | null;
  filter: string;
}

function matchesFilter(entry: FileEntry, filter: string): boolean {
  if (!filter) return true;
  const lower = filter.toLowerCase();
  if (entry.name.toLowerCase().includes(lower)) return true;
  if (entry.isDir && entry.children) {
    return entry.children.some((child) => matchesFilter(child, lower));
  }
  return false;
}

function TreeNode({
  entry,
  depth,
  onFileSelect,
  selectedPath,
  filter,
}: {
  entry: FileEntry;
  depth: number;
  onFileSelect: (path: string) => void;
  selectedPath: string | null;
  filter: string;
}) {
  const [expanded, setExpanded] = useState(depth < 1);

  if (!matchesFilter(entry, filter)) return null;

  if (entry.isDir) {
    return (
      <div>
        <button
          className="flex items-center gap-1 w-full px-2 py-1 text-sm hover:bg-white/10 rounded text-left"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronDown size={14} className="shrink-0 text-neutral-400" />
          ) : (
            <ChevronRight size={14} className="shrink-0 text-neutral-400" />
          )}
          <Folder size={14} className="shrink-0 text-orange-400" />
          <span className="truncate">{entry.name}</span>
        </button>
        {expanded && entry.children && (
          <div>
            {entry.children.map((child) => (
              <TreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                onFileSelect={onFileSelect}
                selectedPath={selectedPath}
                filter={filter}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!entry.name.endsWith(".md")) return null;

  const isSelected = entry.path === selectedPath;

  return (
    <button
      className={`flex items-center gap-1 w-full px-2 py-1 text-sm rounded text-left ${
        isSelected ? "bg-orange-500/20 text-orange-300" : "hover:bg-white/10"
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={() => onFileSelect(entry.path)}
    >
      <File size={14} className="shrink-0 text-neutral-400" />
      <span className="truncate">{entry.name}</span>
    </button>
  );
}

export function FileTree({ entries, onFileSelect, selectedPath, filter }: FileTreeProps) {
  return (
    <div className="py-1">
      {entries.map((entry) => (
        <TreeNode
          key={entry.path}
          entry={entry}
          depth={0}
          onFileSelect={onFileSelect}
          selectedPath={selectedPath}
          filter={filter}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create Sidebar component**

Create `src/components/Sidebar.tsx`:

```tsx
import { useState } from "react";
import { Search, FolderOpen } from "lucide-react";
import { FileEntry } from "../types/files";
import { FileTree } from "./FileTree";

interface SidebarProps {
  entries: FileEntry[];
  onFileSelect: (path: string) => void;
  onOpenFolder: () => void;
  selectedPath: string | null;
}

export function Sidebar({ entries, onFileSelect, onOpenFolder, selectedPath }: SidebarProps) {
  const [filter, setFilter] = useState("");

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-r border-neutral-800">
      {/* Search */}
      <div className="p-2">
        <div className="flex items-center gap-2 px-2 py-1.5 bg-neutral-800 rounded-md">
          <Search size={14} className="text-neutral-400 shrink-0" />
          <input
            type="text"
            placeholder="Filter files..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-transparent text-sm w-full outline-none text-neutral-200 placeholder:text-neutral-500"
          />
        </div>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="px-4 py-8 text-center text-neutral-500 text-sm">
            No folder open.
            <br />
            Open a folder or drop a .md file.
          </div>
        ) : (
          <FileTree
            entries={entries}
            onFileSelect={onFileSelect}
            selectedPath={selectedPath}
            filter={filter}
          />
        )}
      </div>

      {/* Open folder button */}
      <div className="p-2 border-t border-neutral-800">
        <button
          onClick={onOpenFolder}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors"
        >
          <FolderOpen size={14} />
          Open Folder
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx src/components/FileTree.tsx
git commit -m "feat: add Sidebar and FileTree components"
```

---

### Task 4: CodeBlock and MermaidBlock Components

**Files:**
- Create: `src/components/CodeBlock.tsx`
- Create: `src/components/MermaidBlock.tsx`

- [ ] **Step 1: Create CodeBlock component**

Create `src/components/CodeBlock.tsx`:

```tsx
import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  className?: string;
  children: React.ReactNode;
}

export function CodeBlock({ className, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const codeString = String(children).replace(/\n$/, "");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded bg-neutral-700/80 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy code"
      >
        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-neutral-300" />}
      </button>
      <pre className={className}>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}
```

- [ ] **Step 2: Create MermaidBlock component**

Create `src/components/MermaidBlock.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
});

let mermaidCounter = 0;

export function MermaidBlock({ children }: { children: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const render = async () => {
      if (!containerRef.current) return;
      try {
        const id = `mermaid-${++mermaidCounter}`;
        const { svg } = await mermaid.render(id, children);
        containerRef.current.innerHTML = svg;
        setError(null);
      } catch (e) {
        setError(String(e));
      }
    };
    render();
  }, [children]);

  if (error) {
    return (
      <pre className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-300">
        Mermaid error: {error}
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 flex justify-center [&_svg]:max-w-full"
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/CodeBlock.tsx src/components/MermaidBlock.tsx
git commit -m "feat: add CodeBlock with copy and MermaidBlock components"
```

---

### Task 5: MarkdownViewer Component

**Files:**
- Create: `src/components/MarkdownViewer.tsx`

- [ ] **Step 1: Create MarkdownViewer component**

Create `src/components/MarkdownViewer.tsx`:

```tsx
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { MermaidBlock } from "./MermaidBlock";
import { CodeBlock } from "./CodeBlock";

interface MarkdownViewerProps {
  content: string;
  filePath: string | null;
}

export function MarkdownViewer({ content, filePath }: MarkdownViewerProps) {
  if (!content && !filePath) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        <div className="text-center">
          <p className="text-4xl mb-4">📄</p>
          <p className="text-lg">Open a Markdown file to start reading</p>
          <p className="text-sm mt-2">Drag & drop a .md file or open a folder</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-6">
      <article className="prose prose-invert prose-orange max-w-none
        prose-headings:border-b prose-headings:border-neutral-800 prose-headings:pb-2
        prose-a:text-orange-400 prose-a:no-underline hover:prose-a:underline
        prose-code:before:content-none prose-code:after:content-none
        prose-code:bg-neutral-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
        prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-800
        prose-img:rounded-lg
        prose-table:border prose-table:border-neutral-800
        prose-th:bg-neutral-800/50 prose-th:px-4 prose-th:py-2
        prose-td:px-4 prose-td:py-2 prose-td:border-t prose-td:border-neutral-800
      ">
        <Markdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex, rehypeHighlight]}
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              const isBlock = String(children).includes("\n");

              if (match && match[1] === "mermaid") {
                return <MermaidBlock>{String(children).replace(/\n$/, "")}</MermaidBlock>;
              }

              if (isBlock) {
                return <CodeBlock className={className}>{children}</CodeBlock>;
              }

              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            img({ src, alt, ...props }) {
              // Handle relative image paths
              let resolvedSrc = src || "";
              if (filePath && src && !src.startsWith("http") && !src.startsWith("data:")) {
                const dir = filePath.substring(0, filePath.lastIndexOf("/"));
                resolvedSrc = `${dir}/${src}`;
              }
              return <img src={resolvedSrc} alt={alt} {...props} />;
            },
          }}
        >
          {content}
        </Markdown>
      </article>
    </div>
  );
}
```

- [ ] **Step 2: Install @tailwindcss/typography**

```bash
npm install @tailwindcss/typography
```

Add to `src/index.css` at the top:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@import "katex/dist/katex.min.css";
@import "highlight.js/styles/github-dark.min.css";
```

- [ ] **Step 3: Commit**

```bash
git add src/components/MarkdownViewer.tsx src/index.css
git commit -m "feat: add MarkdownViewer with GFM, Mermaid, KaTeX, syntax highlighting"
```

---

### Task 6: ThemeToggle and AboutDialog Components

**Files:**
- Create: `src/components/ThemeToggle.tsx`
- Create: `src/components/AboutDialog.tsx`

- [ ] **Step 1: Create ThemeToggle component**

Create `src/components/ThemeToggle.tsx`:

```tsx
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  theme: "light" | "dark";
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-md hover:bg-neutral-800 transition-colors"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun size={16} className="text-neutral-300" />
      ) : (
        <Moon size={16} className="text-neutral-600" />
      )}
    </button>
  );
}
```

- [ ] **Step 2: Create AboutDialog component**

Create `src/components/AboutDialog.tsx`:

```tsx
import { X } from "lucide-react";

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded">
            <X size={16} className="text-neutral-400" />
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🧪</div>
          <h2 className="text-2xl font-bold text-neutral-100">mdLabs</h2>
          <p className="text-sm text-neutral-400 mt-1">Version 1.0.0</p>
          <p className="text-sm text-neutral-500">2026 mmnLabs</p>
        </div>

        <p className="text-sm text-neutral-300 text-center mb-6">
          A lightweight Markdown reader for macOS.
        </p>

        <div className="space-y-3 text-sm text-neutral-400">
          <div className="flex items-start gap-3 bg-neutral-800/50 rounded-lg p-3">
            <span className="text-orange-400 font-bold">Read-only</span>
            <span>Files are never edited, modified, or saved.</span>
          </div>
          <div className="flex items-start gap-3 bg-neutral-800/50 rounded-lg p-3">
            <span className="text-orange-400 font-bold">Offline</span>
            <span>No internet required. No data sent anywhere.</span>
          </div>
          <div className="flex items-start gap-3 bg-neutral-800/50 rounded-lg p-3">
            <span className="text-orange-400 font-bold">No database</span>
            <span>Reads directly from your filesystem.</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-800 text-xs text-neutral-500 text-center">
          <p>Supports: Markdown, GFM, Mermaid diagrams, LaTeX, syntax highlighting</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ThemeToggle.tsx src/components/AboutDialog.tsx
git commit -m "feat: add ThemeToggle and AboutDialog components"
```

---

### Task 7: Main App — Wire Everything Together

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css` (delete or empty)

- [ ] **Step 1: Delete default App.css content**

Empty `src/App.css` (or delete it). We use TailwindCSS only.

```css
/* Styles handled by TailwindCSS */
```

- [ ] **Step 2: Write the main App component**

Replace `src/App.tsx` entirely:

```tsx
import { useState, useEffect, useCallback } from "react";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir } from "@tauri-apps/plugin-fs";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Sidebar } from "./components/Sidebar";
import { MarkdownViewer } from "./components/MarkdownViewer";
import { ThemeToggle } from "./components/ThemeToggle";
import { AboutDialog } from "./components/AboutDialog";
import { useTheme } from "./hooks/useTheme";
import { FileEntry } from "./types/files";
import { PanelLeftClose, PanelLeft, Info, FileText } from "lucide-react";

function mapDirEntries(entries: { name: string; isDirectory: boolean; isFile: boolean; isSymlink: boolean; children?: any[] }[], parentPath: string): FileEntry[] {
  return entries
    .map((e) => ({
      name: e.name,
      path: `${parentPath}/${e.name}`,
      isDir: e.isDirectory,
      children: e.isDirectory && e.children ? mapDirEntries(e.children, `${parentPath}/${e.name}`) : undefined,
    }))
    .sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);

  const openFile = useCallback(async (path: string) => {
    try {
      const text = await readTextFile(path);
      setContent(text);
      setSelectedPath(path);
    } catch (e) {
      console.error("Failed to read file:", e);
    }
  }, []);

  const loadFolder = useCallback(async (folderPath: string) => {
    try {
      const entries = await readDir(folderPath, { recursive: true });
      const mapped = mapDirEntries(entries as any, folderPath);
      setFileEntries(mapped);
      setCurrentFolder(folderPath);
    } catch (e) {
      console.error("Failed to read directory:", e);
    }
  }, []);

  const handleOpenFolder = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected) {
      await loadFolder(selected as string);
    }
  }, [loadFolder]);

  const handleOpenFile = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (selected) {
      await openFile(selected as string);
    }
  }, [openFile]);

  // Handle file drop
  useEffect(() => {
    const webview = getCurrentWebviewWindow();
    const unlisten = webview.onDragDropEvent(async (event) => {
      if (event.payload.type === "drop") {
        const paths = event.payload.paths;
        if (paths.length > 0) {
          const path = paths[0];
          if (path.endsWith(".md")) {
            await openFile(path);
          } else {
            await loadFolder(path);
          }
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [openFile, loadFolder]);

  const fileName = selectedPath ? selectedPath.split("/").pop() : null;

  return (
    <div className={`h-screen flex flex-col ${theme === "dark" ? "bg-neutral-950 text-neutral-200" : "bg-white text-neutral-800"}`}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-neutral-800 shrink-0" data-tauri-drag-region>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-neutral-800 transition-colors"
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>
          <button
            onClick={handleOpenFile}
            className="p-2 rounded-md hover:bg-neutral-800 transition-colors"
            title="Open file"
          >
            <FileText size={16} />
          </button>
          <span className="text-sm font-semibold text-orange-400">mdLabs</span>
        </div>

        <div className="flex items-center gap-1">
          {fileName && (
            <span className="text-xs text-neutral-500 mr-2">{fileName}</span>
          )}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button
            onClick={() => setAboutOpen(true)}
            className="p-2 rounded-md hover:bg-neutral-800 transition-colors"
            title="About mdLabs"
          >
            <Info size={16} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div className="w-64 shrink-0">
            <Sidebar
              entries={fileEntries}
              onFileSelect={openFile}
              onOpenFolder={handleOpenFolder}
              selectedPath={selectedPath}
            />
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <MarkdownViewer content={content} filePath={selectedPath} />
        </main>
      </div>

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 3: Update main.tsx**

Replace `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/App.css src/main.tsx
git commit -m "feat: wire up main App with sidebar, viewer, drag-drop, dialogs"
```

---

### Task 8: Generate App Icons (PNG sizes for Tauri)

**Files:**
- Modify: `src-tauri/icons/` (generate PNG icon sizes from SVG)

- [ ] **Step 1: Install icon generation tool**

```bash
npm install -g @aspect-ratio/svg2png 2>/dev/null || true
```

If not available, use `sips` (built into macOS) to generate from the SVG thumbnail:

```bash
cd /Users/memen/Documents/mmnLabs/mdLabs/src-tauri/icons

# Generate PNG from SVG preview
qlmanage -t -s 1024 -o . mdlabs-icon.svg
mv mdlabs-icon.svg.png icon.png

# Generate required sizes using sips
sips -z 32 32 icon.png --out 32x32.png
sips -z 128 128 icon.png --out 128x128.png
sips -z 256 256 icon.png --out 128x128@2x.png
sips -z 512 512 icon.png --out icon.png
```

- [ ] **Step 2: Generate .icns for macOS**

```bash
mkdir mdlabs.iconset
sips -z 16 16 icon.png --out mdlabs.iconset/icon_16x16.png
sips -z 32 32 icon.png --out mdlabs.iconset/icon_16x16@2x.png
sips -z 32 32 icon.png --out mdlabs.iconset/icon_32x32.png
sips -z 64 64 icon.png --out mdlabs.iconset/icon_32x32@2x.png
sips -z 128 128 icon.png --out mdlabs.iconset/icon_128x128.png
sips -z 256 256 icon.png --out mdlabs.iconset/icon_128x128@2x.png
sips -z 256 256 icon.png --out mdlabs.iconset/icon_256x256.png
sips -z 512 512 icon.png --out mdlabs.iconset/icon_256x256@2x.png
sips -z 512 512 icon.png --out mdlabs.iconset/icon_512x512.png
cp icon.png mdlabs.iconset/icon_512x512@2x.png
iconutil -c icns mdlabs.iconset
rm -rf mdlabs.iconset
```

- [ ] **Step 3: Update tauri.conf.json icon paths**

```json
"icon": [
  "icons/32x32.png",
  "icons/128x128.png",
  "icons/128x128@2x.png",
  "icons/icon.png",
  "icons/mdlabs.icns"
]
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/icons/ src-tauri/tauri.conf.json
git commit -m "feat: generate app icon in all required sizes"
```

---

### Task 9: Final Build and Test

- [ ] **Step 1: Run dev mode and test all features**

```bash
cd /Users/memen/Documents/mmnLabs/mdLabs
npm run tauri dev
```

Test checklist:
1. Window opens with empty state ("Open a Markdown file to start reading")
2. Click "Open Folder" — native folder picker works
3. Sidebar shows file tree with folders and .md files
4. Click a .md file — content renders in viewer
5. Headings, bold, italic, lists render correctly
6. Code blocks have syntax highlighting + copy button
7. Mermaid diagrams render as SVG
8. LaTeX math renders with KaTeX
9. Tables render with styling
10. Images render (relative paths resolve)
11. Theme toggle (dark/light) works
12. Sidebar toggle (hide/show) works
13. About dialog shows correct info
14. Drag & drop a .md file — opens in viewer
15. Search filter in sidebar filters files by name

- [ ] **Step 2: Build production .app bundle**

```bash
npm run tauri build
```

Expected: `.app` bundle created in `src-tauri/target/release/bundle/macos/mdLabs.app`

- [ ] **Step 3: Test the built app**

```bash
open src-tauri/target/release/bundle/macos/mdLabs.app
```

Verify it opens and works the same as dev mode.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: finalize mdLabs v1.0.0"
```
