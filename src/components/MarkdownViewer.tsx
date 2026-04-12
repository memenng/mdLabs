import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { MermaidBlock } from "./MermaidBlock";
import { CodeBlock } from "./CodeBlock";

interface MarkdownViewerProps {
  content: string;
  filePath: string | null;
}

export function MarkdownViewer({ content, filePath }: MarkdownViewerProps) {
  if (!content && !filePath) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-400 dark:text-neutral-500">
        <div className="text-center">
          <p className="text-5xl mb-4">🧪</p>
          <p className="text-lg font-medium text-neutral-600 dark:text-neutral-400">mdLabs</p>
          <p className="text-sm mt-2">Open a Markdown file to start reading</p>
          <p className="text-xs mt-1 text-neutral-400 dark:text-neutral-600">Drag & drop a .md file or open a folder</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-6">
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
          rehypePlugins={[rehypeKatex, rehypeHighlight]}
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
              return <img src={resolvedSrc} alt={alt} {...props} />;
            },
          }}
        >
          {content}
        </Markdown>
      </article>
    </div>
  );
}
