import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useWindowSize } from "./01_useWindowSize";

import SmartRect from "../BubblesUI/domain/01_SmartRect";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { renderBubble, selectRenderCount } from "@bublys-org/bubbles-ui-state";
import { Bubble, } from "@bublys-org/bubbles-ui";
import { usePositionDebugger } from "../PositionDebugger/domain/PositionDebuggerContext";

type useMyRectProps  = {
  bubble: Bubble;
}

export const useMyRect = ({ bubble }: useMyRectProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [myRect, setMyRect] = useState<SmartRect | undefined>(undefined);

  //うまく取れてない
  const pageSize = useWindowSize();

  const renderCount = useAppSelector(selectRenderCount);

  const dispatch = useAppDispatch();


  const { addRects } = usePositionDebugger();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!pageSize) return;

    const rect = el.getBoundingClientRect();
    setMyRect(new SmartRect(rect, pageSize));


    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderCount]);

  const saveRect = () => {
    if(!ref.current)
      return;

    const rect = new SmartRect(ref.current.getBoundingClientRect(), pageSize);

    const updated = bubble.rendered(rect);
    dispatch(renderBubble(updated.toJSON()));
    addRects (
      [rect]
    )
  };

  useEffect(() => {
      saveRect();
  }, [myRect, myRect?.x, myRect?.y, myRect?.width, myRect?.height]);

  const handleTransitionEnd = () => {
    saveRect();
  }


  return { ref, myRect, handleTransitionEnd  };
};
