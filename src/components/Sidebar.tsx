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
