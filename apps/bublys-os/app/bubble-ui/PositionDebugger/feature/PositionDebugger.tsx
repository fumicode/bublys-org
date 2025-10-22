"use client";

import { FC, useState } from "react";
import { Point2 } from "@bublys-org/bubbles-ui"
import { SmartRect } from "@bublys-org/bubbles-ui";
import { useWindowSize } from "../../01_Utils/01_useWindowSize";
import { PositionDebuggerContext } from "../domain/PositionDebuggerContext";
import { PagePointViewer } from "../ui/PagePointViewer";

type PositionDebuggerProviderProps = {
  children: React.ReactNode;
  isShown?: boolean;
};

//点や矩形を保存しておく。さらに保存するための関数を渡す。
export const PositionDebuggerProvider: FC<PositionDebuggerProviderProps> = ({
  children,
  isShown = true,
}) => {
  const [points, setPoints] = useState<Point2[]>([]);
  const [rects, setRects] = useState<SmartRect[]>([]);
  const pageSize = useWindowSize();
  //------------------- hooks above --------------------

  if (isShown === false) {
    return <>{children}</>;
  }
  const addPoints = (newPoints: Point2[]) => {
    //同じ位置には書かないようにする
    setPoints((prevPoints) => {
      const uniquePoints = newPoints.filter(
        (newPoint) =>
          !prevPoints.some(
            (prevPoint) =>
              prevPoint.x === newPoint.x && prevPoint.y === newPoint.y
          )
      );

      return [...prevPoints, ...uniquePoints];
    });
  };
  const addRects = (newRects: DOMRectReadOnly[]) => {
    const smartRects = newRects.map((rect) => new SmartRect(rect, pageSize));
    setRects((prevRects) => {
      const uniqueRects = smartRects.filter(
        (newRect) =>
          !prevRects.some(
            (prevRect) =>
              prevRect.x === newRect.x &&
              prevRect.y === newRect.y &&
              prevRect.width === newRect.width &&
              prevRect.height === newRect.height
          )
      );

      return [...prevRects, ...uniqueRects];
    });
  };
  return (
    //子コンポーネントにvalueを配布。ここではchildrenとPagePointViewerに配布
    <PositionDebuggerContext.Provider
      value={{
        points,
        rects,
        addPoints,
        addRects,
      }}
    >
      {children}
      <PagePointViewer />
    </PositionDebuggerContext.Provider>
  );
};
