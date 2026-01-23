"use client";

import { FC, useState, useContext } from "react";
import {
  Point2,
  CoordinateSystem,
  SmartRect,
  useWindowSize,
  BubblesContext,
} from "@bublys-org/bubbles-ui";
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
  const { coordinateSystem } = useContext(BubblesContext);
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
    const smartRects = newRects.map((rect) => {
      // すでにSmartRectの場合はそのまま使用（coordinateSystemを保持）
      if (rect instanceof SmartRect) {
        return rect;
      }
      // DOMRectReadOnlyの場合は新しいSmartRectを作成
      return new SmartRect(rect, pageSize);
    });
    setRects((prevRects) => {
      const uniqueRects = smartRects.filter(
        (newRect) =>
          !prevRects.some(
            (prevRect) =>
              prevRect.x === newRect.x &&
              prevRect.y === newRect.y &&
              prevRect.width === newRect.width &&
              prevRect.height === newRect.height &&
              prevRect.coordinateSystem.layerIndex === newRect.coordinateSystem.layerIndex &&
              prevRect.coordinateSystem.offset.x === newRect.coordinateSystem.offset.x &&
              prevRect.coordinateSystem.offset.y === newRect.coordinateSystem.offset.y
          )
      );

      return [...prevRects, ...uniqueRects];
    });
  };

  const removeRect = (index: number) => {
    setRects((prevRects) => prevRects.filter((_, i) => i !== index));
  };

  const removeAllRects = () => {
    setRects([]);
  };

  return (
    //子コンポーネントにvalueを配布。ここではchildrenとPagePointViewerに配布
    <PositionDebuggerContext.Provider
      value={{
        points,
        rects,
        coordinateSystem: coordinateSystem || CoordinateSystem.GLOBAL,
        addPoints,
        addRects,
        removeRect,
        removeAllRects,
      }}
    >
      {children}
      <PagePointViewer />
    </PositionDebuggerContext.Provider>
  );
};
