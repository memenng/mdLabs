import { motion } from "motion/react";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  theme: "light" | "dark";
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.9, rotate: 15 }}
      onClick={onToggle}
      className="p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun size={16} className="text-orange-400" />
      ) : (
        <Moon size={16} className="text-neutral-500" />
      )}
    </motion.button>
  );
}
