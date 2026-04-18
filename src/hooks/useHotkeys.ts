import { useEffect } from "react";

type HotkeyHandler = (e: KeyboardEvent) => void;

export interface HotkeyMap {
  [combo: string]: HotkeyHandler;
}

function matches(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split("+");
  const key = parts[parts.length - 1];
  const needMod = parts.includes("mod");
  const needShift = parts.includes("shift");
  const needAlt = parts.includes("alt");

  const modOk = needMod ? (e.metaKey || e.ctrlKey) : !e.metaKey && !e.ctrlKey;
  const shiftOk = needShift ? e.shiftKey : !e.shiftKey;
  const altOk = needAlt ? e.altKey : !e.altKey;
  const keyOk = e.key.toLowerCase() === key;

  return modOk && shiftOk && altOk && keyOk;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

export function useHotkeys(map: HotkeyMap, opts: { allowInInput?: string[] } = {}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const typing = isTypingTarget(e.target);
      for (const combo of Object.keys(map)) {
        if (!matches(e, combo)) continue;
        if (typing && !opts.allowInInput?.includes(combo)) continue;
        e.preventDefault();
        map[combo](e);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [map, opts.allowInInput]);
}
