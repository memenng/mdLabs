import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "motion/react";

interface LinkPreviewProps {
  href: string | null;
  rect: DOMRect | null;
}

interface Preview {
  title: string;
  excerpt: string;
}

const cache = new Map<string, Preview>();

function extractPreview(md: string): Preview {
  const lines = md.split(/\r?\n/);
  let title = "";
  const excerptLines: string[] = [];
  let inCode = false;
  for (const line of lines) {
    if (/^```/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    if (!title) {
      const h = /^#\s+(.+)$/.exec(line);
      if (h) {
        title = h[1].trim();
        continue;
      }
    }
    const stripped = line.trim();
    if (!stripped) {
      if (excerptLines.length > 0) break;
      continue;
    }
    if (/^#{1,6}\s/.test(stripped)) continue;
    excerptLines.push(stripped);
    if (excerptLines.join(" ").length > 240) break;
  }
  if (!title) title = "Untitled";
  const excerpt = excerptLines.join(" ").replace(/[*_`>\[\]]/g, "").slice(0, 240);
  return { title, excerpt };
}

export function LinkPreview({ href, rect }: LinkPreviewProps) {
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    if (!href) {
      setPreview(null);
      return;
    }
    const cached = cache.get(href);
    if (cached) {
      setPreview(cached);
      return;
    }
    setPreview(null);
    let cancelled = false;
    (async () => {
      try {
        const text = await invoke<string>("read_md_file", { path: href });
        const p = extractPreview(text);
        cache.set(href, p);
        if (!cancelled) setPreview(p);
      } catch {
        // file unreadable — skip silently
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [href]);

  const visible = !!href && !!rect && !!preview;
  const PREVIEW_W = 360;
  const PREVIEW_H = 180;
  const style: React.CSSProperties = rect
    ? (() => {
        const spaceRight = window.innerWidth - rect.right - 12;
        const preferRight = spaceRight >= PREVIEW_W;
        const left = preferRight
          ? rect.right + 8
          : Math.max(8, Math.min(rect.left, window.innerWidth - PREVIEW_W - 8));
        const top = Math.max(
          8,
          Math.min(preferRight ? rect.top : rect.bottom + 6, window.innerHeight - PREVIEW_H - 8),
        );
        return { position: "fixed", top, left, width: PREVIEW_W, zIndex: 40 };
      })()
    : {};

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.12 }}
          style={style}
          className="pointer-events-none rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-3"
        >
          <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 truncate">
            {preview.title}
          </div>
          <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 line-clamp-4">
            {preview.excerpt || "No preview available"}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
