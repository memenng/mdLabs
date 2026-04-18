import { motion, AnimatePresence } from "motion/react";
import { Download, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { UpdaterStatus } from "../hooks/useUpdater";

interface UpdateDialogProps {
  open: boolean;
  onClose: () => void;
  status: UpdaterStatus;
  onInstall: () => void;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function UpdateDialog({ open, onClose, status, onInstall }: UpdateDialogProps) {
  const update = "update" in status ? status.update : null;
  const isBusy = status.kind === "downloading" || status.kind === "installing";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !isBusy && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, type: "spring", stiffness: 400, damping: 30 }}
            className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                Update Tersedia
              </h2>
              <button
                onClick={onClose}
                disabled={isBusy}
                className="p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {status.kind === "available" && update && (
                <>
                  <div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                      Versi baru
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-semibold text-orange-500 dark:text-orange-400">
                        v{update.version}
                      </span>
                      <span className="text-xs text-neutral-400">
                        dari v{update.currentVersion}
                      </span>
                    </div>
                  </div>
                  {update.body && (
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded-md p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {update.body}
                    </div>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={onInstall}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors"
                  >
                    <Download size={14} />
                    Download & Install
                  </motion.button>
                </>
              )}

              {status.kind === "downloading" && (
                <div className="space-y-3">
                  <div className="text-sm text-neutral-700 dark:text-neutral-300">
                    Mendownload update…
                  </div>
                  <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-orange-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: status.total
                          ? `${Math.min(100, (status.downloaded / status.total) * 100)}%`
                          : "100%",
                      }}
                      transition={{ duration: 0.2 }}
                      style={status.total ? undefined : { backgroundImage: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }}
                    />
                  </div>
                  <div className="text-xs text-neutral-500 flex justify-between">
                    <span>{formatBytes(status.downloaded)}</span>
                    {status.total && <span>{formatBytes(status.total)}</span>}
                  </div>
                </div>
              )}

              {status.kind === "installing" && (
                <div className="flex items-center gap-3 py-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    Menginstall… app akan restart otomatis.
                  </span>
                </div>
              )}

              {status.kind === "done" && (
                <div className="flex items-center gap-3 py-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 size={20} />
                  <span className="text-sm">Selesai. Restarting…</span>
                </div>
              )}

              {status.kind === "error" && (
                <div className="flex items-start gap-3 py-2 text-red-600 dark:text-red-400">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <div className="text-xs break-words">{status.message}</div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
