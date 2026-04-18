import { useCallback, useEffect, useRef, useState } from "react";
import { load, Store } from "@tauri-apps/plugin-store";

interface AppSettings {
  sidebarOpen: boolean;
  lastFolder: string | null;
  recentFolders: string[];
  zoom: number;
}

const DEFAULTS: AppSettings = {
  sidebarOpen: true,
  lastFolder: null,
  recentFolders: [],
  zoom: 1,
};

const MAX_RECENT = 8;

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
        setSettings({ ...DEFAULTS, ...stored });
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

  return { settings, loaded, update, pushRecentFolder };
}
