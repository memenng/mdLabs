import { forwardRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import { MermaidBlock } from "./MermaidBlock";
import { CodeBlock } from "./CodeBlock";
import type { FontFamily } from "../hooks/useAppSettings";

interface MarkdownViewerProps {
  content: string;
  filePath: string | null;
  zoom?: number;
  readingMode?: boolean;
  fontFamily?: FontFamily;
  onImageClick?: (src: string, alt?: string) => void;
  onInternalLinkEnter?: (href: string, rect: DOMRect) => void;
  onInternalLinkLeave?: () => void;
  onInternalLinkClick?: (href: string) => void;
}

const FONT_CLASS: Record<FontFamily, string> = {
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

const MarkdownViewer = forwardRef<HTMLDivElement, MarkdownViewerProps>(function MarkdownViewer(
  {
    content,
    filePath,
    zoom = 1,
    readingMode = false,
    fontFamily = "sans",
    onImageClick,
    onInternalLinkEnter,
    onInternalLinkLeave,
    onInternalLinkClick,
  },
  ref,
) {
  if (!content && !filePath) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center h-full text-neutral-400 dark:text-neutral-500"
      >
        <motion.div
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-center"
        >
          <motion.p
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="text-5xl mb-4"
          >
            🧪
          </motion.p>
          <p className="text-lg font-medium text-neutral-600 dark:text-neutral-400">mdLabs</p>
          <p className="text-sm mt-2">Open a Markdown file to start reading</p>
          <p className="text-xs mt-1 text-neutral-400 dark:text-neutral-600">Drag & drop a .md file or open a folder</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={filePath}
        ref={ref}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 30 }}
        style={{ fontSize: `${zoom}em` }}
        className={`${readingMode ? "max-w-2xl" : "max-w-4xl"} mx-auto px-8 py-6 ${FONT_CLASS[fontFamily]}`}
      >
        <article className="prose prose-neutral dark:prose-invert prose-orange max-w-none
          prose-headings:border-b prose-headings:border-neutral-200 dark:prose-headings:border-neutral-800 prose-headings:pb-2
          prose-a:text-orange-500 dark:prose-a:text-orange-400 prose-a:no-underline hover:prose-a:underline
          prose-code:before:content-none prose-code:after:content-none
          prose-code:bg-neutral-100 dark:prose-code:bg-neutral-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-neutral-50 dark:prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-200 dark:prose-pre:border-neutral-800
          prose-img:rounded-lg
          prose-table:border prose-table:border-neutral-200 dark:prose-table:border-neutral-800
          prose-th:bg-neutral-100 dark:prose-th:bg-neutral-800/50 prose-th:px-4 prose-th:py-2
          prose-td:px-4 prose-td:py-2 prose-td:border-t prose-td:border-neutral-200 dark:prose-td:border-neutral-800
        ">
          <Markdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeSlug, rehypeKatex, rehypeHighlight]}
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                const isBlock = String(children).includes("\n");

                if (match && match[1] === "mermaid") {
                  return <MermaidBlock>{String(children).replace(/\n$/, "")}</MermaidBlock>;
                }

                if (isBlock) {
                  return <CodeBlock className={className}>{children}</CodeBlock>;
                }

                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              img({ src, alt, ...props }) {
                let resolvedSrc = src || "";
                if (filePath && src && !src.startsWith("http") && !src.startsWith("data:")) {
                  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
                  resolvedSrc = `asset://localhost/${dir}/${src}`;
                }
                return (
                  <img
                    src={resolvedSrc}
                    alt={alt}
                    loading="lazy"
                    onClick={onImageClick ? () => onImageClick(resolvedSrc, alt) : undefined}
                    style={onImageClick ? { cursor: "zoom-in" } : undefined}
                    {...props}
                  />
                );
              },
              a({ href, children, ...props }) {
                const isInternal =
                  !!href &&
                  !href.startsWith("http") &&
                  !href.startsWith("mailto:") &&
                  !href.startsWith("#") &&
                  /\.md(#.*)?$/i.test(href);
                if (isInternal && filePath) {
                  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
                  const [rel, hash] = href!.split("#");
                  const abs = rel.startsWith("/") ? rel : `${dir}/${rel}`;
                  return (
                    <a
                      href={href}
                      onClick={(e) => {
                        e.preventDefault();
                        onInternalLinkClick?.(hash ? `${abs}#${hash}` : abs);
                      }}
                      onMouseEnter={(e) => {
                        const rect = (e.currentTarget as HTMLAnchorElement).getBoundingClientRect();
                        onInternalLinkEnter?.(abs, rect);
                      }}
                      onMouseLeave={() => onInternalLinkLeave?.()}
                      {...props}
                    >
                      {children}
                    </a>
                  );
                }
                return (
                  <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer" {...props}>
                    {children}
                  </a>
                );
              },
            }}
          >
            {content}
          </Markdown>
        </article>
      </motion.div>
    </AnimatePresence>
  );
});

export { MarkdownViewer };
export default MarkdownViewer;
