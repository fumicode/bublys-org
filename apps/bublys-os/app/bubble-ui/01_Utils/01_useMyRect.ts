import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useWindowSize } from "./01_useWindowSize";
import SmartRect from "../BubblesUI/domain/01_SmartRect";
import { useAppSelector } from "@bublys-org/state-management";
import { selectRenderCount } from "@bublys-org/bubbles-ui-state";

type useMyRectProps  = {
  onRectChanged?: (rect: SmartRect) => void;
}

export const useMyRectObserver = ({ onRectChanged }: useMyRectProps) => {
  const ref = useRef<HTMLDivElement>(null);


  //うまく取れてない
  const pageSize = useWindowSize();

  const renderCount = useAppSelector(selectRenderCount);


  const saveRect = () => {
    if(!ref.current){
      return;
    }

    const rect = new SmartRect(ref.current.getBoundingClientRect(), pageSize);
    onRectChanged?.(rect);
  };


  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!pageSize) return;


    saveRect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderCount]);



  const onRenderChange = () => {
    saveRect();
  }


  return { ref, onRenderChange: onRenderChange  };
};
