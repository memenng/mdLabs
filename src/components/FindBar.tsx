import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronUp, ChevronDown, X } from "lucide-react";

interface FindBarProps {
  open: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  currentMatch: number;
  totalMatches: number;
}

export function FindBar({
  open,
  query,
  onQueryChange,
  onClose,
  onNext,
  onPrev,
  currentMatch,
  totalMatches,
}: FindBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed top-16 right-6 z-40 flex items-center gap-1 px-2 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg"
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.shiftKey ? onPrev() : onNext();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder="Find in file…"
            className="bg-transparent text-sm w-56 px-2 py-1 outline-none text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400"
          />
          <span className="text-xs text-neutral-400 tabular-nums px-1 min-w-[3.5rem] text-center">
            {query ? `${totalMatches === 0 ? 0 : currentMatch + 1}/${totalMatches}` : ""}
          </span>
          <button
            onClick={onPrev}
            disabled={totalMatches === 0}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30"
            title="Previous (Shift+Enter)"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={onNext}
            disabled={totalMatches === 0}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30"
            title="Next (Enter)"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title="Close (Esc)"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
