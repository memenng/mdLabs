import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  className?: string;
  children: React.ReactNode;
}

export function CodeBlock({ className, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const codeString = String(children).replace(/\n$/, "");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded bg-neutral-200/80 dark:bg-neutral-700/80 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy code"
      >
        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-neutral-500 dark:text-neutral-300" />}
      </motion.button>
      <pre className={className}>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}
