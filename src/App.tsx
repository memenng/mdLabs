import { useState, useEffect, useCallback } from "react";
import { readTextFile, readDir } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Sidebar } from "./components/Sidebar";
import { MarkdownViewer } from "./components/MarkdownViewer";
import { ThemeToggle } from "./components/ThemeToggle";
import { AboutDialog } from "./components/AboutDialog";
import { useTheme } from "./hooks/useTheme";
import { FileEntry } from "./types/files";
import { PanelLeftClose, PanelLeft, Info, FileText } from "lucide-react";

interface DirEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
  children?: DirEntry[];
}

function mapDirEntries(entries: DirEntry[], parentPath: string): FileEntry[] {
  return entries
    .map((e) => ({
      name: e.name,
      path: `${parentPath}/${e.name}`,
      isDir: e.isDirectory,
      children: e.isDirectory && e.children
        ? mapDirEntries(e.children, `${parentPath}/${e.name}`)
        : undefined,
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
      const mapped = mapDirEntries(entries as unknown as DirEntry[], folderPath);
      setFileEntries(mapped);
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
