import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Loader2, Regex, CaseSensitive, History } from "lucide-react";
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
  regex: boolean;
  caseSensitive: boolean;
  onToggleRegex: () => void;
  onToggleCaseSensitive: () => void;
  history: string[];
  onCommitQuery: (q: string) => void;
}

export function GlobalSearch({
  rootFolders,
  onPick,
  regex,
  caseSensitive,
  onToggleRegex,
  onToggleCaseSensitive,
  history,
  onCommitQuery,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FileSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const commitRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (commitRef.current) window.clearTimeout(commitRef.current);
    if (rootFolders.length === 0 || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const chunks = await Promise.all(
          rootFolders.map((path) =>
            invoke<FileSearchResult[]>("search_directory", {
              path,
              query,
              regex,
              caseSensitive,
            }).catch((e) => {
              const msg = typeof e === "string" ? e : String(e);
              if (msg.startsWith("Invalid regex")) setError(msg);
              else console.error("search failed for", path, e);
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
    // Commit query to history after user pauses typing (1.5s)
    commitRef.current = window.setTimeout(() => {
      onCommitQuery(query);
    }, 1500);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      if (commitRef.current) window.clearTimeout(commitRef.current);
    };
  }, [query, rootFolders, regex, caseSensitive, onCommitQuery]);

  const totalMatches = results.reduce((s, r) => s + r.matches.length, 0);
  const hasFolder = rootFolders.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 space-y-2">
        <div className="flex items-center gap-2 px-2 py-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-md relative">
          {loading ? (
            <Loader2 size={14} className="text-orange-400 shrink-0 animate-spin" />
          ) : (
            <Search size={14} className="text-neutral-400 shrink-0" />
          )}
          <input
            type="text"
            placeholder={regex ? "Search (regex)…" : "Search…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => history.length > 0 && query.length === 0 && setHistoryOpen(true)}
            onBlur={() => setTimeout(() => setHistoryOpen(false), 150)}
            className="bg-transparent text-sm w-full outline-none text-neutral-700 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
          />
          {history.length > 0 && (
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              title="Recent searches"
              className="p-0.5 rounded hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-400"
            >
              <History size={12} />
            </button>
          )}
          <AnimatePresence>
            {historyOpen && history.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.1 }}
                className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md shadow-lg py-1 z-20 max-h-56 overflow-y-auto"
              >
                {history.map((h) => (
                  <button
                    key={h}
                    onMouseDown={() => {
                      setQuery(h);
                      setHistoryOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 truncate"
                  >
                    {h}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-1 px-1">
          <ToggleChip
            active={caseSensitive}
            onClick={onToggleCaseSensitive}
            title="Case sensitive (Aa)"
          >
            <CaseSensitive size={12} />
          </ToggleChip>
          <ToggleChip active={regex} onClick={onToggleRegex} title="Regex (.*)">
            <Regex size={12} />
          </ToggleChip>
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
        {error && (
          <div className="mx-3 my-2 px-3 py-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        {hasFolder && !error && query.trim().length >= 2 && !loading && results.length === 0 && (
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
                    <span className="text-[10px] text-neutral-400 tabular-nums">line {m.line}</span>
                    <span className="text-xs text-neutral-600 dark:text-neutral-300 break-words w-full">
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

function ToggleChip({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1 rounded transition-colors ${
        active
          ? "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300"
          : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}
