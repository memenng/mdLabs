import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface Heading {
  id: string;
  text: string;
  level: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export function extractHeadings(md: string): Heading[] {
  const lines = md.split("\n");
  const out: Heading[] = [];
  let inCode = false;
  for (const line of lines) {
    if (/^```/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      const level = m[1].length;
      const text = m[2].trim();
      out.push({ id: slugify(text), text, level });
    }
  }
  return out;
}

interface TocPanelProps {
  content: string;
  viewerRef: React.RefObject<HTMLElement | null>;
  open: boolean;
}

export function TocPanel({ content, viewerRef, open }: TocPanelProps) {
  const headings = useMemo(() => extractHeadings(content), [content]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || headings.length === 0) return;
    const root = viewerRef.current;
    if (!root) return;
    const scrollContainer = root.closest("main") as HTMLElement | null;
    if (!scrollContainer) return;

    const onScroll = () => {
      const nodes = Array.from(
        root.querySelectorAll("h1, h2, h3, h4, h5, h6"),
      ) as HTMLElement[];
      let current: string | null = null;
      const top = scrollContainer.getBoundingClientRect().top + 80;
      for (const n of nodes) {
        if (n.getBoundingClientRect().top <= top) current = n.id || current;
      }
      setActiveId(current);
    };
    onScroll();
    scrollContainer.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", onScroll);
  }, [headings, viewerRef, open]);

  const scrollTo = (id: string) => {
    const el = viewerRef.current?.querySelector(`#${CSS.escape(id)}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AnimatePresence>
      {open && headings.length > 0 && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, type: "spring", stiffness: 400, damping: 30 }}
          className="shrink-0 overflow-hidden border-l border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900"
        >
          <div className="w-60 h-full flex flex-col">
            <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
              Outline
            </div>
            <nav className="flex-1 overflow-y-auto py-1">
              {headings.map((h, i) => (
                <button
                  key={`${h.id}-${i}`}
                  onClick={() => scrollTo(h.id)}
                  className={`block w-full text-left px-3 py-1 text-xs truncate transition-colors ${
                    activeId === h.id
                      ? "text-orange-500 dark:text-orange-400 bg-orange-500/5 border-l-2 border-orange-500"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 border-l-2 border-transparent"
                  }`}
                  style={{ paddingLeft: `${(h.level - 1) * 10 + 12}px` }}
                >
                  {h.text}
                </button>
              ))}
            </nav>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
