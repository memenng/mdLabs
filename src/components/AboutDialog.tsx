import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion(""));
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                <X size={16} className="text-neutral-400" />
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🧪</div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">mdLabs</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Version {version || "…"}
              </p>
              <p className="text-sm text-neutral-400 dark:text-neutral-500">2026 mmnLabs</p>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-300 text-center mb-6">
              A lightweight Markdown reader for macOS.
            </p>

            <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
              <div className="flex items-start gap-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3">
                <span className="text-orange-500 dark:text-orange-400 font-bold shrink-0">Read-only</span>
                <span>Files are never edited, modified, or saved.</span>
              </div>
              <div className="flex items-start gap-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3">
                <span className="text-orange-500 dark:text-orange-400 font-bold shrink-0">Offline</span>
                <span>No internet required. No data sent anywhere.</span>
              </div>
              <div className="flex items-start gap-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3">
                <span className="text-orange-500 dark:text-orange-400 font-bold shrink-0">No database</span>
                <span>Reads directly from your filesystem.</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-400 dark:text-neutral-500 text-center">
              <p>Supports: Markdown, GFM, Mermaid diagrams, LaTeX, syntax highlighting</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
