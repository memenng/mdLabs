import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  FolderOpen,
  RefreshCw,
  Files,
  ChevronDown,
  ChevronRight,
  Star,
  Clock,
  X,
} from "lucide-react";
import { FileEntry } from "../types/files";
import { FileTree } from "./FileTree";
import { GlobalSearch } from "./GlobalSearch";

interface SidebarProps {
  entries: FileEntry[];
  onFileSelect: (path: string) => void;
  onOpenFolder: () => void;
  onOpenRecent: (path: string) => void;
  onRefresh: () => void;
  canRefresh: boolean;
  selectedPath: string | null;
  rootFolders: string[];
  recentFolders: string[];
  onRemoveRoot: (path: string) => void;
  onFileHover?: (path: string, rect: DOMRect) => void;
  onFileUnhover?: () => void;
  pinnedFiles: string[];
  recentFiles: string[];
  onTogglePin: (path: string) => void;
  searchRegex: boolean;
  searchCaseSensitive: boolean;
  onToggleSearchRegex: () => void;
  onToggleSearchCaseSensitive: () => void;
  searchHistory: string[];
  onCommitSearchQuery: (q: string) => void;
}

function fileBasename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

type Tab = "files" | "search";

export function Sidebar({
  entries,
  onFileSelect,
  onOpenFolder,
  onOpenRecent,
  onRefresh,
  canRefresh,
  selectedPath,
  rootFolders,
  recentFolders,
  onRemoveRoot,
  onFileHover,
  onFileUnhover,
  pinnedFiles,
  recentFiles,
  onTogglePin,
  searchRegex,
  searchCaseSensitive,
  onToggleSearchRegex,
  onToggleSearchCaseSensitive,
  searchHistory,
  onCommitSearchQuery,
}: SidebarProps) {
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<Tab>("files");
  const [recentOpen, setRecentOpen] = useState(false);
  const [pinnedExpanded, setPinnedExpanded] = useState(true);
  const [recentExpanded, setRecentExpanded] = useState(false);
  const pinnedSet = new Set(pinnedFiles);

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full bg-neutral-100 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800"
    >
      {/* Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
        <TabButton active={tab === "files"} onClick={() => setTab("files")} icon={<Files size={13} />}>
          Files
        </TabButton>
        <TabButton active={tab === "search"} onClick={() => setTab("search")} icon={<Search size={13} />}>
          Search
        </TabButton>
      </div>

      {tab === "files" && (
        <>
          {/* Filter */}
          <div className="p-2">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-md">
              <Search size={14} className="text-neutral-400 shrink-0" />
              <input
                type="text"
                placeholder="Filter files…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-transparent text-sm w-full outline-none text-neutral-700 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
              />
            </div>
          </div>

          {/* Pinned + Recent + Tree */}
          <div className="flex-1 overflow-y-auto">
            {pinnedFiles.length > 0 && (
              <FlatFileSection
                title="Pinned"
                icon={<Star size={12} className="fill-orange-400 text-orange-400" />}
                items={pinnedFiles}
                expanded={pinnedExpanded}
                onToggle={() => setPinnedExpanded((v) => !v)}
                selectedPath={selectedPath}
                onFileSelect={onFileSelect}
                onFileHover={onFileHover}
                onFileUnhover={onFileUnhover}
                renderAction={(path) => (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(path);
                    }}
                    title="Unpin"
                    className="absolute right-1 p-1 rounded hover:bg-neutral-300 dark:hover:bg-neutral-700"
                  >
                    <X size={12} className="text-neutral-400" />
                  </button>
                )}
              />
            )}
            {recentFiles.length > 0 && (
              <FlatFileSection
                title="Recent"
                icon={<Clock size={12} className="text-neutral-400" />}
                items={recentFiles.slice(0, 10)}
                expanded={recentExpanded}
                onToggle={() => setRecentExpanded((v) => !v)}
                selectedPath={selectedPath}
                onFileSelect={onFileSelect}
                onFileHover={onFileHover}
                onFileUnhover={onFileUnhover}
              />
            )}
            {entries.length === 0 ? (
              <div className="px-4 py-8 text-center text-neutral-400 dark:text-neutral-500 text-sm">
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
                rootPaths={rootFolders}
                onRemoveRoot={onRemoveRoot}
                onFileHover={onFileHover}
                onFileUnhover={onFileUnhover}
                pinnedSet={pinnedSet}
                onTogglePin={onTogglePin}
              />
            )}
          </div>
        </>
      )}

      {tab === "search" && (
        <GlobalSearch
          rootFolders={rootFolders}
          onPick={onFileSelect}
          regex={searchRegex}
          caseSensitive={searchCaseSensitive}
          onToggleRegex={onToggleSearchRegex}
          onToggleCaseSensitive={onToggleSearchCaseSensitive}
          history={searchHistory}
          onCommitQuery={onCommitSearchQuery}
        />
      )}

      {/* Actions */}
      <div className="p-2 border-t border-neutral-200 dark:border-neutral-800 flex gap-2 relative">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenFolder}
          className="flex items-center justify-center gap-2 flex-1 px-3 py-2 text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-md transition-colors"
        >
          <FolderOpen size={14} />
          {rootFolders.length === 0 ? "Open Folder" : "Add Folder"}
        </motion.button>
        {recentFolders.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setRecentOpen((v) => !v)}
            title="Recent folders"
            className="flex items-center justify-center px-2 py-2 text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-md transition-colors text-neutral-600 dark:text-neutral-300"
          >
            <ChevronDown size={14} />
          </motion.button>
        )}
        {canRefresh && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98, rotate: 180 }}
            onClick={onRefresh}
            title="Refresh folder"
            className="flex items-center justify-center px-3 py-2 text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-md transition-colors text-neutral-600 dark:text-neutral-300"
          >
            <RefreshCw size={14} />
          </motion.button>
        )}

        <AnimatePresence>
          {recentOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-14 left-2 right-2 max-h-64 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md shadow-lg py-1 z-20"
            >
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-neutral-400">
                Recent folders
              </div>
              {recentFolders.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setRecentOpen(false);
                    onOpenRecent(p);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 truncate"
                  title={p}
                >
                  {p.split(/[\\/]/).filter(Boolean).pop()}
                  <span className="text-neutral-400 ml-1">
                    {p.substring(0, p.lastIndexOf("/"))}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function FlatFileSection({
  title,
  icon,
  items,
  expanded,
  onToggle,
  selectedPath,
  onFileSelect,
  onFileHover,
  onFileUnhover,
  renderAction,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  expanded: boolean;
  onToggle: () => void;
  selectedPath: string | null;
  onFileSelect: (path: string) => void;
  onFileHover?: (path: string, rect: DOMRect) => void;
  onFileUnhover?: () => void;
  renderAction?: (path: string) => React.ReactNode;
}) {
  return (
    <div className="py-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-wider text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
      >
        <motion.span animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronRight size={10} />
        </motion.span>
        {icon}
        <span>{title}</span>
        <span className="ml-auto normal-case text-neutral-400">{items.length}</span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: "hidden" }}
          >
            {items.map((path) => {
              const isSelected = path === selectedPath;
              return (
                <div
                  key={path}
                  className="group relative flex items-center"
                  onMouseEnter={(e) => {
                    if (!onFileHover) return;
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    onFileHover(path, rect);
                  }}
                  onMouseLeave={() => onFileUnhover?.()}
                >
                  <button
                    onClick={() => onFileSelect(path)}
                    title={path}
                    className={`w-full flex items-center gap-1 px-2 py-1 text-sm rounded text-left truncate ${
                      isSelected
                        ? "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10"
                    }`}
                    style={{ paddingLeft: "22px" }}
                  >
                    <span className="truncate">{fileBasename(path)}</span>
                  </button>
                  {renderAction?.(path)}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 flex-1 py-2 text-xs font-medium transition-colors ${
        active
          ? "text-orange-500 dark:text-orange-400 border-b-2 border-orange-500 dark:border-orange-400"
          : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 border-b-2 border-transparent"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
