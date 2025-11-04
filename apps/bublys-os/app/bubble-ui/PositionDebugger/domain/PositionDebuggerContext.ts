//pointsとrectsを保存するコンテキスト

import { createContext, useContext } from "react";
import { Point2, SmartRect } from "@bublys-org/bubbles-ui"

export type PositionDebuggerState = {
  points: Point2[];
  rects: SmartRect[]; // SmartRectはDOMRectReadOnlyを拡張したクラス。内部で親のサイズやそれを使った関数をもつ

  addPoints: (points: Point2[]) => void;
  addRects: (rects: DOMRectReadOnly[]) => void; //外からもらうときは、一般的なDOMRectを使う
};

export const PositionDebuggerContext = createContext<PositionDebuggerState>({
  points: [],
  rects: [],

  addPoints: (points) => {
    console.warn("addPoints not implemented");
  },
  addRects: (rects) => {
    console.warn("addRects not implemented");
  },
});

export const usePositionDebugger = () => {
  const context = useContext(PositionDebuggerContext);
  if (!context) {
    throw new Error(
      "usePositionDebugger must be used within a PositionDebuggerProvider"
    );
  }
  return context;
};
