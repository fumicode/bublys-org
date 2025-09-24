import { useLayoutEffect, useRef, useState } from "react";
import { useWindowSize } from "./01_useWindowSize";
import { usePositionDebugger } from "../PositionDebugger/domain/PositionDebuggerContext";

import SmartRect from "../BubblesUI/domain/01_SmartRect";

export const useMyRect = () => {
  const ref = useRef<HTMLDivElement>(null);

  const [myRect, setMyRect] = useState<SmartRect | undefined>(undefined);
  const pageSize = useWindowSize();

  const { addRects } = usePositionDebugger();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!pageSize) return;

    const setRect = () => {
      const rect = el.getBoundingClientRect();
      const newRect = new SmartRect(rect, pageSize);
      setMyRect(newRect);
      addRects([newRect]);
    };

    const ro = new ResizeObserver(setRect);

    ro.observe(el);

    setRect();

    return () => {
      ro.disconnect();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, myRect };
};
