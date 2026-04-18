import { useCallback, useEffect, useRef, useState } from "react";

interface Match {
  node: Text;
  start: number;
  end: number;
}

function collectTextNodes(root: Node): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === "SCRIPT" || tag === "STYLE") return NodeFilter.FILTER_REJECT;
      return node.nodeValue && node.nodeValue.trim().length > 0
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);
  return nodes;
}

function findMatches(nodes: Text[], query: string): Match[] {
  if (!query) return [];
  const q = query.toLowerCase();
  const out: Match[] = [];
  for (const node of nodes) {
    const text = node.nodeValue ?? "";
    const lower = text.toLowerCase();
    let from = 0;
    while (true) {
      const idx = lower.indexOf(q, from);
      if (idx < 0) break;
      out.push({ node, start: idx, end: idx + query.length });
      from = idx + query.length;
    }
  }
  return out;
}

export function useInFileSearch(
  containerRef: React.RefObject<HTMLElement | null>,
  contentKey: string | null,
) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const matchesRef = useRef<Match[]>([]);

  const clearHighlights = useCallback(() => {
    if ("highlights" in CSS) {
      (CSS as unknown as { highlights: Map<string, unknown> }).highlights.delete("mdlabs-find");
      (CSS as unknown as { highlights: Map<string, unknown> }).highlights.delete("mdlabs-find-active");
    }
  }, []);

  const applyHighlights = useCallback((matches: Match[], activeIdx: number) => {
    if (!("Highlight" in window)) return;
    const HighlightCtor = (window as unknown as { Highlight: typeof Highlight }).Highlight;
    const highlights = (CSS as unknown as { highlights: Map<string, Highlight> }).highlights;

    const all = new HighlightCtor();
    const active = new HighlightCtor();
    matches.forEach((m, i) => {
      const range = document.createRange();
      range.setStart(m.node, m.start);
      range.setEnd(m.node, m.end);
      if (i === activeIdx) active.add(range);
      else all.add(range);
    });
    highlights.set("mdlabs-find", all);
    highlights.set("mdlabs-find-active", active);
  }, []);

  const scrollToMatch = useCallback((match: Match) => {
    const range = document.createRange();
    range.setStart(match.node, match.start);
    range.setEnd(match.node, match.end);
    const rect = range.getBoundingClientRect();
    const parent = match.node.parentElement;
    if (parent && rect.height > 0) {
      const vh = window.innerHeight;
      if (rect.top < 80 || rect.bottom > vh - 40) {
        parent.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  }, []);

  const runSearch = useCallback(
    (q: string, preferredIdx = 0) => {
      if (!containerRef.current) {
        matchesRef.current = [];
        setTotal(0);
        setCurrent(0);
        clearHighlights();
        return;
      }
      const nodes = collectTextNodes(containerRef.current);
      const matches = findMatches(nodes, q);
      matchesRef.current = matches;
      setTotal(matches.length);
      const idx = matches.length === 0 ? 0 : Math.min(preferredIdx, matches.length - 1);
      setCurrent(idx);
      clearHighlights();
      if (matches.length) {
        applyHighlights(matches, idx);
        scrollToMatch(matches[idx]);
      }
    },
    [applyHighlights, clearHighlights, scrollToMatch, containerRef],
  );

  useEffect(() => {
    if (open && query) runSearch(query, 0);
    else clearHighlights();
  }, [query, open, contentKey, runSearch, clearHighlights]);

  useEffect(() => clearHighlights, [clearHighlights]);

  const next = useCallback(() => {
    if (matchesRef.current.length === 0) return;
    const idx = (current + 1) % matchesRef.current.length;
    setCurrent(idx);
    applyHighlights(matchesRef.current, idx);
    scrollToMatch(matchesRef.current[idx]);
  }, [current, applyHighlights, scrollToMatch]);

  const prev = useCallback(() => {
    if (matchesRef.current.length === 0) return;
    const idx = (current - 1 + matchesRef.current.length) % matchesRef.current.length;
    setCurrent(idx);
    applyHighlights(matchesRef.current, idx);
    scrollToMatch(matchesRef.current[idx]);
  }, [current, applyHighlights, scrollToMatch]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    clearHighlights();
  }, [clearHighlights]);

  return { query, setQuery, open, setOpen, current, total, next, prev, close };
}
