import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Search, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface SearchMatch {
  line: number;
  column: number;
  snippet: string;
}

interface FileSearchResult {
  path: string;
  name: string;
  matches: SearchMatch[];
}

interface GlobalSearchProps {
  rootFolders: string[];
  onPick: (path: string) => void;
}

export function GlobalSearch({ rootFolders, onPick }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FileSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (rootFolders.length === 0 || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const chunks = await Promise.all(
          rootFolders.map((path) =>
            invoke<FileSearchResult[]>("search_directory", { path, query }).catch((e) => {
              console.error("search failed for", path, e);
              return [] as FileSearchResult[];
            }),
          ),
        );
        const merged = new Map<string, FileSearchResult>();
        for (const chunk of chunks) {
          for (const r of chunk) merged.set(r.path, r);
        }
        setResults(Array.from(merged.values()));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, rootFolders]);

  const totalMatches = results.reduce((s, r) => s + r.matches.length, 0);
  const hasFolder = rootFolders.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="p-2">
        <div className="flex items-center gap-2 px-2 py-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-md">
          {loading ? (
            <Loader2 size={14} className="text-orange-400 shrink-0 animate-spin" />
          ) : (
            <Search size={14} className="text-neutral-400 shrink-0" />
          )}
          <input
            type="text"
            placeholder={
              rootFolders.length > 1 ? "Search in folders…" : "Search in folder…"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent text-sm w-full outline-none text-neutral-700 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto text-sm">
        {!hasFolder && (
          <div className="px-4 py-6 text-center text-neutral-400 text-xs">
            Open a folder to search.
          </div>
        )}
        {hasFolder && query.trim().length < 2 && (
          <div className="px-4 py-6 text-center text-neutral-400 text-xs">
            Type at least 2 characters.
          </div>
        )}
        {hasFolder && query.trim().length >= 2 && !loading && results.length === 0 && (
          <div className="px-4 py-6 text-center text-neutral-400 text-xs">No matches.</div>
        )}
        {results.length > 0 && (
          <div className="px-2 pb-2">
            <div className="text-xs text-neutral-400 px-2 pb-2">
              {totalMatches} match{totalMatches === 1 ? "" : "es"} in {results.length} file
              {results.length === 1 ? "" : "s"}
            </div>
            {results.map((file) => (
              <div key={file.path} className="mb-2">
                <div className="px-2 py-1 text-xs font-medium text-orange-500 dark:text-orange-400 truncate">
                  {file.name}
                </div>
                {file.matches.map((m, i) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onPick(file.path)}
                    className="flex flex-col items-start w-full px-3 py-1.5 text-left rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <span className="text-[10px] text-neutral-400 tabular-nums">
                      line {m.line}
                    </span>
                    <span className="text-xs text-neutral-600 dark:text-neutral-300 truncate w-full">
                      {m.snippet}
                    </span>
                  </motion.button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
