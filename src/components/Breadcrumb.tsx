import { ChevronRight } from "lucide-react";

interface BreadcrumbProps {
  filePath: string | null;
  rootFolder: string | null;
}

export function Breadcrumb({ filePath, rootFolder }: BreadcrumbProps) {
  if (!filePath) return null;
  let relative = filePath;
  if (rootFolder && filePath.startsWith(rootFolder)) {
    relative = filePath.slice(rootFolder.length).replace(/^[\\/]/, "");
  }
  const parts = relative.split(/[\\/]/).filter(Boolean);
  if (parts.length === 0) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500 overflow-hidden max-w-[50vw]">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1 min-w-0">
          {i > 0 && <ChevronRight size={10} className="shrink-0 text-neutral-300 dark:text-neutral-700" />}
          <span
            className={`truncate ${
              i === parts.length - 1
                ? "text-neutral-600 dark:text-neutral-300 font-medium"
                : ""
            }`}
          >
            {p}
          </span>
        </span>
      ))}
    </div>
  );
}
