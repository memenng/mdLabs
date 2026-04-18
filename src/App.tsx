import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Sidebar } from "./components/Sidebar";
import { MarkdownViewer } from "./components/MarkdownViewer";
import { ThemeToggle } from "./components/ThemeToggle";
import { AboutDialog } from "./components/AboutDialog";
import { UpdateDialog } from "./components/UpdateDialog";
import { FindBar } from "./components/FindBar";
import { TocPanel, extractHeadings } from "./components/TocPanel";
import { Breadcrumb } from "./components/Breadcrumb";
import { ReadingStatus } from "./components/ReadingStatus";
import { useTheme } from "./hooks/useTheme";
import { useUpdater } from "./hooks/useUpdater";
import { useAppSettings } from "./hooks/useAppSettings";
import { useHotkeys } from "./hooks/useHotkeys";
import { useInFileSearch } from "./hooks/useInFileSearch";
import { PanelLeftClose, PanelLeft, Info, FileText, List } from "lucide-react";

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
  const { status: updateStatus, downloadAndInstall } = useUpdater();
  const { settings, loaded: settingsLoaded, update: updateSetting, pushRecentFolder } =
    useAppSettings();
  const sidebarOpen = settings.sidebarOpen;
  const setSidebarOpen = useCallback(
    (v: boolean) => updateSetting("sidebarOpen", v),
    [updateSetting],
  );
  const zoom = settings.zoom;
  const setZoom = useCallback(
    (v: number) => updateSetting("zoom", Math.max(0.7, Math.min(2, v))),
    [updateSetting],
  );
  const [aboutOpen, setAboutOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const hasUpdate =
    updateStatus.kind === "available" ||
    updateStatus.kind === "downloading" ||
    updateStatus.kind === "installing";
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [rootFolder, setRootFolder] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const viewerRef = useRef<HTMLDivElement>(null);
  const find = useInFileSearch(viewerRef, selectedPath);

  const openFile = useCallback(async (path: string) => {
    try {
      const text = await invoke<string>("read_md_file", { path });
      setContent(text);
      setSelectedPath(path);
    } catch (e) {
      console.error("Failed to read file:", e);
    }
  }, []);

  const loadFolder = useCallback(
    async (folderPath: string) => {
      try {
        const entries = await invoke<RustFileEntry[]>("read_directory", { path: folderPath });
        const children = mapEntries(entries);
        const name = folderPath.split(/[\\/]/).filter(Boolean).pop() ?? folderPath;
        setFileEntries([{ name, path: folderPath, isDir: true, children }]);
        setRootFolder(folderPath);
        pushRecentFolder(folderPath);
      } catch (e) {
        console.error("Failed to read directory:", e);
      }
    },
    [pushRecentFolder],
  );

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

  // Restore last folder once settings are loaded
  useEffect(() => {
    if (settingsLoaded && settings.lastFolder && !rootFolder) {
      loadFolder(settings.lastFolder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded]);

  // Auto-refresh folder when window regains focus
  useEffect(() => {
    const onFocus = () => {
      refreshFolder();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshFolder]);

  const hotkeyMap = useMemo(
    () => ({
      "mod+f": () => {
        if (selectedPath) find.setOpen(true);
      },
      "mod+o": () => handleOpenFolder(),
      "mod+b": () => setSidebarOpen(!sidebarOpen),
      "mod+=": () => setZoom(zoom + 0.1),
      "mod++": () => setZoom(zoom + 0.1),
      "mod+-": () => setZoom(zoom - 0.1),
      "mod+0": () => setZoom(1),
      escape: () => {
        if (find.open) find.close();
      },
    }),
    [selectedPath, find, handleOpenFolder, sidebarOpen, setSidebarOpen, zoom, setZoom],
  );
  useHotkeys(hotkeyMap, { allowInInput: ["escape", "mod+f"] });

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

  const hasHeadings = useMemo(() => extractHeadings(content).length > 0, [content]);
  const scrollRef = useRef<HTMLElement>(null);

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
          <Breadcrumb filePath={selectedPath} rootFolder={rootFolder} />
          <div className="w-2" />
          {hasHeadings && (
            <button
              onClick={() => setTocOpen((v) => !v)}
              className={`p-2 rounded-md transition-colors ${
                tocOpen
                  ? "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300"
                  : "hover:bg-neutral-200 dark:hover:bg-neutral-800"
              }`}
              title="Toggle outline"
            >
              <List size={16} />
            </button>
          )}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button
            onClick={() => (hasUpdate ? setUpdateOpen(true) : setAboutOpen(true))}
            className="relative p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            title={hasUpdate ? "Update tersedia" : "About mdLabs"}
          >
            <Info size={16} />
            {hasUpdate && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-neutral-50 dark:ring-neutral-950"
              />
            )}
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
                  onOpenRecent={loadFolder}
                  onRefresh={refreshFolder}
                  canRefresh={!!rootFolder}
                  selectedPath={selectedPath}
                  rootFolder={rootFolder}
                  recentFolders={settings.recentFolders}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main ref={scrollRef} className="flex-1 overflow-y-auto relative">
          <ReadingStatus content={content} scrollContainerRef={scrollRef} />
          <FindBar
            open={find.open}
            query={find.query}
            onQueryChange={find.setQuery}
            onClose={find.close}
            onNext={find.next}
            onPrev={find.prev}
            currentMatch={find.current}
            totalMatches={find.total}
          />
          <MarkdownViewer ref={viewerRef} content={content} filePath={selectedPath} zoom={zoom} />
        </main>

        <TocPanel content={content} viewerRef={viewerRef} open={tocOpen} />
      </div>

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <UpdateDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        status={updateStatus}
        onInstall={downloadAndInstall}
      />
    </div>
  );
}
