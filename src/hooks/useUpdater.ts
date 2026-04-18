import { useCallback, useEffect, useState } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdaterStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available"; update: Update }
  | { kind: "downloading"; update: Update; downloaded: number; total: number | null }
  | { kind: "installing"; update: Update }
  | { kind: "done"; update: Update }
  | { kind: "error"; message: string };

export function useUpdater() {
  const [status, setStatus] = useState<UpdaterStatus>({ kind: "idle" });

  const checkForUpdate = useCallback(async () => {
    setStatus({ kind: "checking" });
    try {
      const update = await check();
      if (update) {
        setStatus({ kind: "available", update });
      } else {
        setStatus({ kind: "idle" });
      }
    } catch (e) {
      setStatus({ kind: "error", message: String(e) });
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    setStatus((prev) => {
      if (prev.kind !== "available") return prev;
      return { kind: "downloading", update: prev.update, downloaded: 0, total: null };
    });

    try {
      const current =
        status.kind === "available" ? status.update : null;
      if (!current) return;

      let total: number | null = null;
      let downloaded = 0;

      await current.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            total = event.data.contentLength ?? null;
            setStatus({ kind: "downloading", update: current, downloaded: 0, total });
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            setStatus({ kind: "downloading", update: current, downloaded, total });
            break;
          case "Finished":
            setStatus({ kind: "installing", update: current });
            break;
        }
      });

      setStatus({ kind: "done", update: current });
      await relaunch();
    } catch (e) {
      setStatus({ kind: "error", message: String(e) });
    }
  }, [status]);

  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  return { status, checkForUpdate, downloadAndInstall };
}
