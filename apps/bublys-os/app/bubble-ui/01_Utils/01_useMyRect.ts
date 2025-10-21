import { useLayoutEffect, useRef, useState } from "react";
import { useWindowSize } from "./01_useWindowSize";
import { usePositionDebugger } from "../PositionDebugger/domain/PositionDebuggerContext";

import SmartRect from "../BubblesUI/domain/01_SmartRect";
import { useAppSelector } from "@bublys-org/state-management";
import { selectRenderCount } from "@bublys-org/bubbles-ui-state";

export const useMyRect = () => {
  const ref = useRef<HTMLDivElement>(null);

  const [myRect, setMyRect] = useState<SmartRect | undefined>(undefined);

  //うまく取れてない
  const pageSize = useWindowSize();


  const renderCount = useAppSelector(selectRenderCount);
  const { addRects } = usePositionDebugger();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!pageSize) return;

    const rect = el.getBoundingClientRect();
    setMyRect(new SmartRect(rect, pageSize));

    console.log();
    


    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderCount]);

  return { ref, myRect };
};
