import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export function useFolderWatcher(
  paths: string[],
  onChanged: (changedPaths: string[]) => void,
) {
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const off = await listen<string[]>("folder-changed", (e) => {
        if (!cancelled) onChanged(e.payload ?? []);
      });
      unlisten = off;

      for (const p of paths) {
        invoke("watch_folder", { path: p }).catch((e) =>
          console.error("watch_folder failed", p, e),
        );
      }
    })();

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
      for (const p of paths) {
        invoke("unwatch_folder", { path: p }).catch(() => {});
      }
    };
  }, [paths.join("|"), onChanged]);
}
