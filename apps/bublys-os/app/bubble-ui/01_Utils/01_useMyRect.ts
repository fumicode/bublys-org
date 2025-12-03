"use client";
import { useLayoutEffect, useRef, useContext } from "react";
import { useWindowSize } from "./01_useWindowSize";
import { SmartRect, GLOBAL_COORDINATE_SYSTEM } from "@bublys-org/bubbles-ui";
import { useAppSelector } from "@bublys-org/state-management";
import { selectRenderCount } from "@bublys-org/bubbles-ui-state";
import { BubblesContext } from "../BubblesUI/domain/BubblesContext";

type useMyRectProps  = {
  onRectChanged?: (rect: SmartRect) => void;
}

export const useMyRectObserver = ({ onRectChanged }: useMyRectProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { coordinateSystem } = useContext(BubblesContext);

  //うまく取れてない
  const pageSize = useWindowSize();

  const renderCount = useAppSelector(selectRenderCount);


  const saveRect = () => {
    if(!ref.current){
      return;
    }

    // getBoundingClientRect()はグローバル座標を返すので、まずGLOBAL_COORDINATE_SYSTEMでSmartRectを作成
    const globalRect = new SmartRect(ref.current.getBoundingClientRect(), pageSize, GLOBAL_COORDINATE_SYSTEM);
    // その後、ローカル座標系に変換
    const localRect = globalRect.toLocal(coordinateSystem);
    onRectChanged?.(localRect);
  };


  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!pageSize) return;


    saveRect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderCount, pageSize, coordinateSystem]);



  const notifyRendered = () => {
    saveRect();
  }


  return { ref, notifyRendered };
};
