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
