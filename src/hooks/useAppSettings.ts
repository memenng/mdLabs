import { useCallback, useEffect, useRef, useState } from "react";
import { load, Store } from "@tauri-apps/plugin-store";

export type FontFamily = "sans" | "serif" | "mono";

interface AppSettings {
  sidebarOpen: boolean;
  lastFolder: string | null;
  openFolders: string[];
  recentFolders: string[];
  zoom: number;
  readingMode: boolean;
  fontFamily: FontFamily;
  recentFiles: string[];
  pinnedFiles: string[];
  lastFile: string | null;
  scrollPositions: Record<string, number>;
  searchHistory: string[];
  searchRegex: boolean;
  searchCaseSensitive: boolean;
}

const DEFAULTS: AppSettings = {
  sidebarOpen: true,
  lastFolder: null,
  openFolders: [],
  recentFolders: [],
  zoom: 1,
  readingMode: false,
  fontFamily: "sans",
  recentFiles: [],
  pinnedFiles: [],
  lastFile: null,
  scrollPositions: {},
  searchHistory: [],
  searchRegex: false,
  searchCaseSensitive: false,
};

const MAX_SEARCH_HISTORY = 10;

const MAX_RECENT = 8;
const MAX_RECENT_FILES = 20;
const MAX_SCROLL_ENTRIES = 200;

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const storeRef = useRef<Store | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const store = await load("settings.json", {
          autoSave: true,
          defaults: DEFAULTS as unknown as Record<string, unknown>,
        });
        storeRef.current = store;
        const stored: Partial<AppSettings> = {};
        for (const k of Object.keys(DEFAULTS) as (keyof AppSettings)[]) {
          const v = await store.get<AppSettings[typeof k]>(k);
          if (v !== undefined && v !== null) stored[k] = v as never;
        }
        const merged = { ...DEFAULTS, ...stored };
        // Migration: if openFolders is empty but lastFolder exists, seed it.
        if ((!merged.openFolders || merged.openFolders.length === 0) && merged.lastFolder) {
          merged.openFolders = [merged.lastFolder];
          store.set("openFolders", merged.openFolders).catch(() => {});
        }
        setSettings(merged);
      } catch (e) {
        console.error("Failed to load settings:", e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    storeRef.current?.set(key, value).catch((e) => console.error("store set failed:", e));
  }, []);

  const pushRecentFolder = useCallback((path: string) => {
    setSettings((prev) => {
      const next = [path, ...prev.recentFolders.filter((p) => p !== path)].slice(0, MAX_RECENT);
      storeRef.current?.set("recentFolders", next).catch(() => {});
      storeRef.current?.set("lastFolder", path).catch(() => {});
      return { ...prev, recentFolders: next, lastFolder: path };
    });
  }, []);

  const addOpenFolder = useCallback((path: string) => {
    setSettings((prev) => {
      if (prev.openFolders.includes(path)) return prev;
      const next = [...prev.openFolders, path];
      storeRef.current?.set("openFolders", next).catch(() => {});
      return { ...prev, openFolders: next };
    });
  }, []);

  const removeOpenFolder = useCallback((path: string) => {
    setSettings((prev) => {
      const next = prev.openFolders.filter((p) => p !== path);
      storeRef.current?.set("openFolders", next).catch(() => {});
      return { ...prev, openFolders: next };
    });
  }, []);

  const pushRecentFile = useCallback((path: string) => {
    setSettings((prev) => {
      const next = [path, ...prev.recentFiles.filter((p) => p !== path)].slice(0, MAX_RECENT_FILES);
      storeRef.current?.set("recentFiles", next).catch(() => {});
      storeRef.current?.set("lastFile", path).catch(() => {});
      return { ...prev, recentFiles: next, lastFile: path };
    });
  }, []);

  const togglePinnedFile = useCallback((path: string) => {
    setSettings((prev) => {
      const pinned = prev.pinnedFiles.includes(path)
        ? prev.pinnedFiles.filter((p) => p !== path)
        : [...prev.pinnedFiles, path];
      storeRef.current?.set("pinnedFiles", pinned).catch(() => {});
      return { ...prev, pinnedFiles: pinned };
    });
  }, []);

  const saveScrollPosition = useCallback((path: string, scroll: number) => {
    setSettings((prev) => {
      const next = { ...prev.scrollPositions, [path]: scroll };
      // LRU-ish eviction: if over cap, drop oldest keys (preserve recent files + pinned)
      const keys = Object.keys(next);
      if (keys.length > MAX_SCROLL_ENTRIES) {
        const keep = new Set<string>([
          ...prev.recentFiles,
          ...prev.pinnedFiles,
          path,
        ]);
        const trimmed: Record<string, number> = {};
        for (const k of keys) {
          if (keep.has(k)) trimmed[k] = next[k];
        }
        storeRef.current?.set("scrollPositions", trimmed).catch(() => {});
        return { ...prev, scrollPositions: trimmed };
      }
      storeRef.current?.set("scrollPositions", next).catch(() => {});
      return { ...prev, scrollPositions: next };
    });
  }, []);

  const pushSearchHistory = useCallback((q: string) => {
    const query = q.trim();
    if (query.length < 2) return;
    setSettings((prev) => {
      const next = [query, ...prev.searchHistory.filter((x) => x !== query)].slice(
        0,
        MAX_SEARCH_HISTORY,
      );
      storeRef.current?.set("searchHistory", next).catch(() => {});
      return { ...prev, searchHistory: next };
    });
  }, []);

  return {
    settings,
    loaded,
    update,
    pushRecentFolder,
    addOpenFolder,
    removeOpenFolder,
    pushRecentFile,
    togglePinnedFile,
    saveScrollPosition,
    pushSearchHistory,
  };
}
