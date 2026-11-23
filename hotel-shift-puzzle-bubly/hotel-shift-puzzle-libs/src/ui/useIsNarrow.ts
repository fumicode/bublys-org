import { useEffect, useState } from "react";
import { isNarrowScreen } from "@bublys-org/bubbles-ui";

/**
 * 要素の幅が狭いか（スマホなど）。画面の幅ではなく、**その要素自身の幅**で決める。
 * PC でもバブルを細くすれば同じ表示になる（同じ幅なら同じ見え方）。
 * 境目は画面の「狭い」と同じ値（bubbles-ui の narrow-screen.ts）。
 *
 * ref はコールバックで返す（styled-components の ref にもそのまま渡せる）。
 */
export function useIsNarrow<T extends HTMLElement>() {
  const [el, ref] = useState<T | null>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setNarrow(isNarrowScreen(entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return { ref, narrow };
}
