import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "motion/react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Sidebar } from "./components/Sidebar";
const MarkdownViewer = lazy(() => import("./components/MarkdownViewer"));
import { ThemeToggle } from "./components/ThemeToggle";
import { AboutDialog } from "./components/AboutDialog";
import { UpdateDialog } from "./components/UpdateDialog";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { FindBar } from "./components/FindBar";
import { TocPanel, extractHeadings } from "./components/TocPanel";
import { Breadcrumb } from "./components/Breadcrumb";
import { ReadingStatus } from "./components/ReadingStatus";
import { ReadingControls } from "./components/ReadingControls";
import { ImageLightbox } from "./components/ImageLightbox";
import { LinkPreview } from "./components/LinkPreview";
import type { FontFamily } from "./hooks/useAppSettings";
import { useTheme } from "./hooks/useTheme";
import { useUpdater } from "./hooks/useUpdater";
import { useAppSettings } from "./hooks/useAppSettings";
import { useHotkeys } from "./hooks/useHotkeys";
import { useInFileSearch } from "./hooks/useInFileSearch";
import { useFolderWatcher } from "./hooks/useFolderWatcher";
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

function folderBasename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

async function loadFolderEntry(folderPath: string): Promise<FileEntry> {
  const entries = await invoke<RustFileEntry[]>("read_directory", { path: folderPath });
  return {
    name: folderBasename(folderPath),
    path: folderPath,
    isDir: true,
    children: mapEntries(entries),
  };
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { status: updateStatus, downloadAndInstall } = useUpdater();
  const {
    settings,
    loaded: settingsLoaded,
    update: updateSetting,
    pushRecentFolder,
    addOpenFolder,
    removeOpenFolder,
    pushRecentFile,
    togglePinnedFile,
    saveScrollPosition,
    pushSearchHistory,
  } = useAppSettings();
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
  const readingMode = settings.readingMode;
  const setReadingMode = useCallback(
    (v: boolean) => updateSetting("readingMode", v),
    [updateSetting],
  );
  const fontFamily = settings.fontFamily;
  const cycleFontFamily = useCallback(() => {
    const order: FontFamily[] = ["sans", "serif", "mono"];
    const next = order[(order.indexOf(fontFamily) + 1) % order.length];
    updateSetting("fontFamily", next);
  }, [fontFamily, updateSetting]);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt?: string } | null>(null);
  const [linkHover, setLinkHover] = useState<{ href: string; rect: DOMRect } | null>(null);
  const hasUpdate =
    updateStatus.kind === "available" ||
    updateStatus.kind === "downloading" ||
    updateStatus.kind === "installing";
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const viewerRef = useRef<HTMLDivElement>(null);
  const find = useInFileSearch(viewerRef, selectedPath);

  const rootFolders = settings.openFolders;
  const activeRootFolder = useMemo(() => {
    if (!selectedPath) return rootFolders[rootFolders.length - 1] ?? null;
    const match = rootFolders.find((r) => selectedPath.startsWith(r));
    return match ?? rootFolders[rootFolders.length - 1] ?? null;
  }, [rootFolders, selectedPath]);

  const scrollRef = useRef<HTMLElement>(null);
  const pendingScrollRef = useRef<number | null>(null);

  const openFile = useCallback(
    async (path: string, opts?: { restoreScroll?: boolean }) => {
      try {
        // persist scroll of previously-open file before switching
        if (selectedPath && scrollRef.current) {
          saveScrollPosition(selectedPath, scrollRef.current.scrollTop);
        }
        const text = await invoke<string>("read_md_file", { path });
        setContent(text);
        setSelectedPath(path);
        pushRecentFile(path);
        pendingScrollRef.current = opts?.restoreScroll
          ? settings.scrollPositions[path] ?? 0
          : 0;
      } catch (e) {
        console.error("Failed to read file:", e);
      }
    },
    [selectedPath, saveScrollPosition, pushRecentFile, settings.scrollPositions],
  );

  const addFolder = useCallback(
    async (folderPath: string) => {
      try {
        const rootEntry = await loadFolderEntry(folderPath);
        setFileEntries((prev) => {
          const existing = prev.findIndex((e) => e.path === folderPath);
          if (existing >= 0) {
            const next = [...prev];
            next[existing] = rootEntry;
            return next;
          }
          return [...prev, rootEntry];
        });
        addOpenFolder(folderPath);
        pushRecentFolder(folderPath);
      } catch (e) {
        console.error("Failed to read directory:", e);
      }
    },
    [addOpenFolder, pushRecentFolder],
  );

  const refreshFolders = useCallback(async () => {
    if (rootFolders.length === 0) return;
    try {
      const results = await Promise.all(rootFolders.map(loadFolderEntry));
      setFileEntries(results);
    } catch (e) {
      console.error("Failed to refresh directories:", e);
    }
  }, [rootFolders]);

  const handleOpenFolder = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected) {
      await addFolder(selected as string);
    }
  }, [addFolder]);

  const handleOpenFile = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (selected) {
      await openFile(selected as string);
    }
  }, [openFile]);

  const requestRemoveRoot = useCallback((path: string) => {
    setRemoveTarget(path);
  }, []);

  const confirmRemoveRoot = useCallback(() => {
    if (!removeTarget) return;
    setFileEntries((prev) => prev.filter((e) => e.path !== removeTarget));
    removeOpenFolder(removeTarget);
    if (selectedPath && selectedPath.startsWith(removeTarget)) {
      setSelectedPath(null);
      setContent("");
    }
    setRemoveTarget(null);
  }, [removeTarget, removeOpenFolder, selectedPath]);

  // Restore open folders once settings are loaded
  useEffect(() => {
    if (!settingsLoaded) return;
    if (fileEntries.length > 0) return;
    if (settings.openFolders.length === 0) return;
    (async () => {
      const results = await Promise.all(
        settings.openFolders.map(async (p) => {
          try {
            return await loadFolderEntry(p);
          } catch (e) {
            console.error("Failed to load folder", p, e);
            return null;
          }
        }),
      );
      setFileEntries(results.filter((r): r is FileEntry => r !== null));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded]);

  // Auto-refresh folders when window regains focus
  useEffect(() => {
    const onFocus = () => {
      refreshFolders();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshFolders]);

  // Auto-refresh when watched folders change on disk
  useFolderWatcher(rootFolders, refreshFolders);

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
      "mod+shift+r": () => setReadingMode(!readingMode),
      escape: () => {
        if (lightbox) setLightbox(null);
        else if (find.open) find.close();
      },
    }),
    [selectedPath, find, handleOpenFolder, sidebarOpen, setSidebarOpen, zoom, setZoom, readingMode, setReadingMode, lightbox],
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
            await addFolder(path);
          }
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [openFile, addFolder]);

  const hasHeadings = useMemo(() => extractHeadings(content).length > 0, [content]);

  // Apply pending scroll once content is rendered (restore on open; reset to 0 otherwise)
  useEffect(() => {
    if (!scrollRef.current) return;
    const target = pendingScrollRef.current ?? 0;
    pendingScrollRef.current = null;
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = target;
    });
  }, [content]);

  // Persist scroll position (debounced) as user scrolls
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !selectedPath) return;
    let timer: number | null = null;
    const onScroll = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        saveScrollPosition(selectedPath, el.scrollTop);
      }, 300);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (timer) window.clearTimeout(timer);
    };
  }, [selectedPath, saveScrollPosition]);

  // Auto-restore last-opened file on startup
  useEffect(() => {
    if (!settingsLoaded) return;
    if (selectedPath) return;
    if (!settings.lastFile) return;
    openFile(settings.lastFile, { restoreScroll: true }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded]);

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
          <Breadcrumb filePath={selectedPath} rootFolder={activeRootFolder} />
          <div className="w-2" />
          <ReadingControls
            readingMode={readingMode}
            onToggleReadingMode={() => setReadingMode(!readingMode)}
            fontFamily={fontFamily}
            onCycleFontFamily={cycleFontFamily}
          />
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
          {sidebarOpen && !readingMode && (
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
                  onOpenRecent={addFolder}
                  onRefresh={refreshFolders}
                  canRefresh={rootFolders.length > 0}
                  selectedPath={selectedPath}
                  rootFolders={rootFolders}
                  recentFolders={settings.recentFolders}
                  onRemoveRoot={requestRemoveRoot}
                  onFileHover={(path, rect) => setLinkHover({ href: path, rect })}
                  onFileUnhover={() => setLinkHover(null)}
                  pinnedFiles={settings.pinnedFiles}
                  recentFiles={settings.recentFiles}
                  onTogglePin={togglePinnedFile}
                  searchRegex={settings.searchRegex}
                  searchCaseSensitive={settings.searchCaseSensitive}
                  onToggleSearchRegex={() => updateSetting("searchRegex", !settings.searchRegex)}
                  onToggleSearchCaseSensitive={() =>
                    updateSetting("searchCaseSensitive", !settings.searchCaseSensitive)
                  }
                  searchHistory={settings.searchHistory}
                  onCommitSearchQuery={pushSearchHistory}
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
<Suspense
            fallback={
              <div className="flex items-center justify-center h-full text-xs text-neutral-400">
                Loading viewer…
              </div>
            }
          >
          <MarkdownViewer
            ref={viewerRef}
            content={content}
            filePath={selectedPath}
            zoom={zoom}
            readingMode={readingMode}
            fontFamily={fontFamily}
            onImageClick={(src, alt) => setLightbox({ src, alt })}
            onInternalLinkEnter={(href, rect) => setLinkHover({ href, rect })}
            onInternalLinkLeave={() => setLinkHover(null)}
            onInternalLinkClick={(href) => {
              setLinkHover(null);
              const [abs, hash] = href.split("#");
              openFile(abs).then(() => {
                if (hash) {
                  requestAnimationFrame(() => {
                    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
                  });
                }
              });
            }}
          />
          </Suspense>
        </main>

        <TocPanel content={content} viewerRef={viewerRef} open={readingMode ? false : tocOpen} />
      </div>

      <ImageLightbox
        src={lightbox?.src ?? null}
        alt={lightbox?.alt}
        onClose={() => setLightbox(null)}
      />
      <LinkPreview href={linkHover?.href ?? null} rect={linkHover?.rect ?? null} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <UpdateDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        status={updateStatus}
        onInstall={downloadAndInstall}
      />
      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove folder?"
        message={
          removeTarget
            ? `Hapus "${folderBasename(removeTarget)}" dari navigation? Folder asli di disk tidak terhapus.`
            : ""
        }
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={confirmRemoveRoot}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
