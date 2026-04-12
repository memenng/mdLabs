import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
});

let mermaidCounter = 0;

export function MermaidBlock({ children }: { children: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const render = async () => {
      if (!containerRef.current) return;
      try {
        const id = `mermaid-${++mermaidCounter}`;
        const { svg } = await mermaid.render(id, children);
        containerRef.current.innerHTML = svg;
        setError(null);
      } catch (e) {
        setError(String(e));
      }
    };
    render();
  }, [children]);

  if (error) {
    return (
      <pre className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-300">
        Mermaid error: {error}
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 flex justify-center [&_svg]:max-w-full"
    />
  );
}
