import { useEffect, useRef, useState } from "react";

let mermaidCounter = 0;
let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => {
      m.default.initialize({
        startOnLoad: false,
        theme: "dark",
        securityLevel: "loose",
      });
      return m.default;
    });
  }
  return mermaidPromise;
}

export function MermaidBlock({ children }: { children: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = await loadMermaid();
        if (cancelled || !containerRef.current) return;
        const id = `mermaid-${++mermaidCounter}`;
        const { svg } = await mermaid.render(id, children);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [children]);

  if (error) {
    return (
      <pre className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-300">
        Mermaid error: {error}
      </pre>
    );
  }

  return <div ref={containerRef} className="my-4 flex justify-center [&_svg]:max-w-full" />;
}
