import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";

interface ReadingStatusProps {
  content: string;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}

export function ReadingStatus({ content, scrollContainerRef }: ReadingStatusProps) {
  const [progress, setProgress] = useState(0);

  const stats = useMemo(() => {
    const text = content.replace(/```[\s\S]*?```/g, "").replace(/[#*_`>~\[\]()!-]/g, " ");
    const words = text.split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / 200));
    return { words, minutes };
  }, [content]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(1, el.scrollTop / max) : 0);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollContainerRef, content]);

  if (!content) return null;

  return (
    <>
      <div className="fixed top-12 left-0 right-0 h-0.5 bg-transparent z-30 pointer-events-none">
        <motion.div
          className="h-full bg-orange-500"
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>
      <div className="fixed bottom-2 right-4 z-20 pointer-events-none text-[10px] text-neutral-400 dark:text-neutral-500 tabular-nums bg-white/70 dark:bg-neutral-950/70 backdrop-blur px-2 py-1 rounded">
        {stats.words.toLocaleString()} words · {stats.minutes} min read
      </div>
    </>
  );
}
