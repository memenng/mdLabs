import { invoke } from "@tauri-apps/api/core";

let installed = false;

export function logError(context: string, err: unknown) {
  const message = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
  invoke("append_error_log", { message: `[${context}] ${message}` }).catch(() => {});
}

export function installGlobalErrorLog() {
  if (installed) return;
  installed = true;
  window.addEventListener("error", (e) => {
    logError("window.error", e.error ?? e.message);
  });
  window.addEventListener("unhandledrejection", (e) => {
    logError("unhandledrejection", e.reason);
  });
}
