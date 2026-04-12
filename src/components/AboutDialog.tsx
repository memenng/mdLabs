import { X } from "lucide-react";

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded">
            <X size={16} className="text-neutral-400" />
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🧪</div>
          <h2 className="text-2xl font-bold text-neutral-100">mdLabs</h2>
          <p className="text-sm text-neutral-400 mt-1">Version 1.0.0</p>
          <p className="text-sm text-neutral-500">2026 mmnLabs</p>
        </div>

        <p className="text-sm text-neutral-300 text-center mb-6">
          A lightweight Markdown reader for macOS.
        </p>

        <div className="space-y-3 text-sm text-neutral-400">
          <div className="flex items-start gap-3 bg-neutral-800/50 rounded-lg p-3">
            <span className="text-orange-400 font-bold shrink-0">Read-only</span>
            <span>Files are never edited, modified, or saved.</span>
          </div>
          <div className="flex items-start gap-3 bg-neutral-800/50 rounded-lg p-3">
            <span className="text-orange-400 font-bold shrink-0">Offline</span>
            <span>No internet required. No data sent anywhere.</span>
          </div>
          <div className="flex items-start gap-3 bg-neutral-800/50 rounded-lg p-3">
            <span className="text-orange-400 font-bold shrink-0">No database</span>
            <span>Reads directly from your filesystem.</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-800 text-xs text-neutral-500 text-center">
          <p>Supports: Markdown, GFM, Mermaid diagrams, LaTeX, syntax highlighting</p>
        </div>
      </div>
    </div>
  );
}
