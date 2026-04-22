import { BookOpen, Type } from "lucide-react";
import type { FontFamily } from "../hooks/useAppSettings";

interface ReadingControlsProps {
  readingMode: boolean;
  onToggleReadingMode: () => void;
  fontFamily: FontFamily;
  onCycleFontFamily: () => void;
}

const FONT_LABEL: Record<FontFamily, string> = {
  sans: "Sans",
  serif: "Serif",
  mono: "Mono",
};

export function ReadingControls({
  readingMode,
  onToggleReadingMode,
  fontFamily,
  onCycleFontFamily,
}: ReadingControlsProps) {
  return (
    <>
      <button
        onClick={onCycleFontFamily}
        className="p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1"
        title={`Font: ${FONT_LABEL[fontFamily]} (klik untuk ganti)`}
      >
        <Type size={16} />
        <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
          {FONT_LABEL[fontFamily]}
        </span>
      </button>
      <button
        onClick={onToggleReadingMode}
        className={`p-2 rounded-md transition-colors ${
          readingMode
            ? "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300"
            : "hover:bg-neutral-200 dark:hover:bg-neutral-800"
        }`}
        title="Reading mode (Cmd+Shift+R)"
      >
        <BookOpen size={16} />
      </button>
    </>
  );
}
