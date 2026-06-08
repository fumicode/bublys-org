"use client";
import { useContext, useEffect, useRef } from "react";
import { CoordinateSystem, Layer, Point2 } from "@bublys-org/bubbles-ui-util";
import { useAppDispatch } from "@bublys-org/state-management";
import { Bubble } from "../Bubble.domain.js";
import { BubblesContext } from "../bubble-routing/BubbleRouting.js";
import { useUniverseId } from "../context/UniverseContext.js";
import { updateBubble } from "../state/bubbles-slice.js";
import { createUniverse } from "../universe-config.js";

type UseBubbleDragArgs = {
  bubble: Bubble;
  ref: React.RefObject<HTMLElement | null>;
  layerIndex?: number;
  vanishingPoint?: Point2;
};

/**
 * バブル本体（または窓）のヘッダーからのドラッグを担当する hook。
 * BubbleView / UniverseBubbleView で共通。
 *
 * 振る舞いは BubbleView 元の実装をそのまま踏襲：
 *  - ドラッグ中は DOM 直接操作（left/top + transform-origin）で Redux を回さない
 *  - ドラッグ終了時に 1 回だけ updateBubble を dispatch
 *  - universe 端は createUniverse().clamp() でクランプ
 */
export function useBubbleDrag({ bubble, ref, layerIndex, vanishingPoint }: UseBubbleDragArgs) {
  const dispatch = useAppDispatch();
  const universeId = useUniverseId();
  const { surfaceLeftTop } = useContext(BubblesContext);

  const surfaceLeftTopRef = useRef(surfaceLeftTop);
  surfaceLeftTopRef.current = surfaceLeftTop;
  const vanishingPointRef = useRef(vanishingPoint);
  vanishingPointRef.current = vanishingPoint;
  const bubbleRef = useRef(bubble);
  bubbleRef.current = bubble;
  const layerIndexRef = useRef(layerIndex);
  layerIndexRef.current = layerIndex;

  const dragStartPosRef = useRef<Point2 | null>(null);
  const dragStartMouseRef = useRef<Point2 | null>(null);
  const currentDragPosRef = useRef<Point2 | null>(null);

  const handleDragging = (e: MouseEvent) => {
    if (!dragStartPosRef.current || !dragStartMouseRef.current || !ref.current) return;
    const screenDelta = {
      x: e.clientX - dragStartMouseRef.current.x,
      y: e.clientY - dragStartMouseRef.current.y,
    };

    const coordSystem = CoordinateSystem.fromLayerIndex(layerIndexRef.current || 0)
      .withVanishingPoint(vanishingPointRef.current || { x: 0, y: 0 });

    const localDelta = coordSystem.transformScreenDeltaToLocal(screenDelta);

    const rawLocal = {
      x: dragStartPosRef.current.x + localDelta.x,
      y: dragStartPosRef.current.y + localDelta.y,
    };

    const surfaceLayer = new Layer(
      0,
      surfaceLeftTopRef.current,
      vanishingPointRef.current || { x: 0, y: 0 },
    );
    const universe = createUniverse();
    const newPos = surfaceLayer.locate(universe.clamp(surfaceLayer.place(rawLocal)));

    currentDragPosRef.current = newPos;
    const screenPos = surfaceLayer.place(newPos);
    ref.current.style.left = `${screenPos.x}px`;
    ref.current.style.top = `${screenPos.y}px`;
    ref.current.style.transition = "none";

    const newTransformOrigin = coordSystem.calculateTransformOrigin(screenPos);
    ref.current.style.transformOrigin = `${newTransformOrigin.x}px ${newTransformOrigin.y}px`;
  };

  const endDrag = () => {
    if (currentDragPosRef.current) {
      dispatch(updateBubble(bubbleRef.current.moveTo(currentDragPosRef.current).toJSON(), universeId));
    }
    if (ref.current) {
      ref.current.style.transition = "";
      ref.current.style.transformOrigin = "";
      ref.current.style.left = "";
      ref.current.style.top = "";
    }
    dragStartPosRef.current = null;
    dragStartMouseRef.current = null;
    currentDragPosRef.current = null;
    document.removeEventListener("mousemove", handleDragging);
    document.removeEventListener("mouseup", endDrag);
  };

  const onDragStart = (e: { clientX: number; clientY: number; stopPropagation: () => void }) => {
    e.stopPropagation();
    dragStartPosRef.current = { ...bubbleRef.current.position };
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    document.addEventListener("mousemove", handleDragging);
    document.addEventListener("mouseup", endDrag);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleDragging);
      document.removeEventListener("mouseup", endDrag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { onDragStart };
}
