import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Sidebar } from "./components/Sidebar";
import { MarkdownViewer } from "./components/MarkdownViewer";
import { ThemeToggle } from "./components/ThemeToggle";
import { AboutDialog } from "./components/AboutDialog";
import { useTheme } from "./hooks/useTheme";
import { PanelLeftClose, PanelLeft, Info, FileText } from "lucide-react";

interface RustFileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children: RustFileEntry[] | null;
}

interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileEntry[];
}

function mapEntries(entries: RustFileEntry[]): FileEntry[] {
  return entries.map((e) => ({
    name: e.name,
    path: e.path,
    isDir: e.is_dir,
    children: e.children ? mapEntries(e.children) : undefined,
  }));
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [rootFolder, setRootFolder] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState("");

  const openFile = useCallback(async (path: string) => {
    try {
      const text = await invoke<string>("read_md_file", { path });
      setContent(text);
      setSelectedPath(path);
    } catch (e) {
      console.error("Failed to read file:", e);
    }
  }, []);

  const loadFolder = useCallback(async (folderPath: string) => {
    try {
      const entries = await invoke<RustFileEntry[]>("read_directory", { path: folderPath });
      const children = mapEntries(entries);
      const name = folderPath.split(/[\\/]/).filter(Boolean).pop() ?? folderPath;
      setFileEntries([{ name, path: folderPath, isDir: true, children }]);
      setRootFolder(folderPath);
    } catch (e) {
      console.error("Failed to read directory:", e);
    }
  }, []);

  const refreshFolder = useCallback(async () => {
    if (!rootFolder) return;
    try {
      const entries = await invoke<RustFileEntry[]>("read_directory", { path: rootFolder });
      const children = mapEntries(entries);
      const name = rootFolder.split(/[\\/]/).filter(Boolean).pop() ?? rootFolder;
      setFileEntries([{ name, path: rootFolder, isDir: true, children }]);
    } catch (e) {
      console.error("Failed to refresh directory:", e);
    }
  }, [rootFolder]);

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

  // Auto-refresh folder when window regains focus
  useEffect(() => {
    const onFocus = () => {
      refreshFolder();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshFolder]);

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
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 shrink-0" data-tauri-drag-region>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>
          <button
            onClick={handleOpenFile}
            className="p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            title="Open file"
          >
            <FileText size={16} />
          </button>
          <span className="text-sm font-semibold text-orange-500 dark:text-orange-400">mdLabs</span>
        </div>

        <div className="flex items-center gap-1">
          {fileName && (
            <span className="text-xs text-neutral-400 dark:text-neutral-500 mr-2">{fileName}</span>
          )}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button
            onClick={() => setAboutOpen(true)}
            className="p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            title="About mdLabs"
          >
            <Info size={16} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 256, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, type: "spring", stiffness: 400, damping: 30 }}
              className="shrink-0 overflow-hidden"
            >
              <div className="w-64 h-full">
                <Sidebar
                  entries={fileEntries}
                  onFileSelect={openFile}
                  onOpenFolder={handleOpenFolder}
                  onRefresh={refreshFolder}
                  canRefresh={!!rootFolder}
                  selectedPath={selectedPath}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto">
          <MarkdownViewer content={content} filePath={selectedPath} />
        </main>
      </div>

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
