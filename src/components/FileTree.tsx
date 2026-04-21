import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, File, Folder, X } from "lucide-react";
import { FileEntry } from "../types/files";

interface FileTreeProps {
  entries: FileEntry[];
  onFileSelect: (path: string) => void;
  selectedPath: string | null;
  filter: string;
  rootPaths?: string[];
  onRemoveRoot?: (path: string) => void;
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
  isRoot,
  onRemoveRoot,
}: {
  entry: FileEntry;
  depth: number;
  onFileSelect: (path: string) => void;
  selectedPath: string | null;
  filter: string;
  isRoot?: boolean;
  onRemoveRoot?: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [hover, setHover] = useState(false);

  if (!matchesFilter(entry, filter)) return null;

  if (entry.isDir) {
    return (
      <div>
        <div
          className="group relative flex items-center"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <button
            className="flex items-center gap-1 w-full px-2 py-1 text-sm hover:bg-neutral-200 dark:hover:bg-white/10 rounded text-left text-neutral-700 dark:text-neutral-300"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => setExpanded(!expanded)}
          >
            <motion.span
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.15 }}
              className="shrink-0"
            >
              <ChevronRight size={14} className="text-neutral-400" />
            </motion.span>
            <Folder size={14} className="shrink-0 text-orange-400" />
            <span className={`truncate ${isRoot ? "font-medium" : ""}`}>{entry.name}</span>
          </button>
          {isRoot && onRemoveRoot && hover && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveRoot(entry.path);
              }}
              title="Remove from navigation"
              className="absolute right-1 p-0.5 rounded hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
            >
              <X size={12} />
            </motion.button>
          )}
        </div>
        <AnimatePresence>
          {expanded && entry.children && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ overflow: "hidden" }}
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (!entry.name.endsWith(".md")) return null;

  const isSelected = entry.path === selectedPath;

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={`flex items-center gap-1 w-full px-2 py-1 text-sm rounded text-left transition-colors ${
        isSelected
          ? "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300"
          : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10"
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={() => onFileSelect(entry.path)}
    >
      <File size={14} className="shrink-0 text-neutral-400" />
      <span className="truncate">{entry.name}</span>
    </motion.button>
  );
}

export function FileTree({
  entries,
  onFileSelect,
  selectedPath,
  filter,
  rootPaths,
  onRemoveRoot,
}: FileTreeProps) {
  const rootSet = rootPaths ? new Set(rootPaths) : null;
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
          isRoot={rootSet ? rootSet.has(entry.path) : false}
          onRemoveRoot={onRemoveRoot}
        />
      ))}
    </div>
  );
}
