"use client";
import { useContext, useEffect, useRef } from "react";
import { Layer, Point2 } from "@bublys-org/bubbles-ui-util";
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
 * 振る舞い:
 *  - ドラッグ中は DOM 直接操作（left/top + transform-origin）で Redux を回さない
 *  - ドラッグ終了時に 1 回だけ updateBubble を dispatch
 *  - universe 端は createUniverse().clamp() でクランプ
 *
 * 座標は {@link useBubbleResize} と同じ扱いにそろえてある:
 *  - 面は 2 つを名前で分ける（surface = 位置の変換 / depth = 移動量の変換）
 *  - 起点は `bubble.position` ではなく**画面に出ている実物（DOM）**から作る
 *    （position は未設定のとき getter が {0,0} を返すので、掴んだ瞬間に原点へ飛ぶ）
 *  - 移動そのものの規則は集約（{@link Bubble.moveBy}）が持つ
 */
export function useBubbleDrag({ bubble, ref, layerIndex, vanishingPoint }: UseBubbleDragArgs) {
  const dispatch = useAppDispatch();
  const universeId = useUniverseId();
  const { surfaceLeftTop } = useContext(BubblesContext);

  const bubbleRef = useRef(bubble);
  bubbleRef.current = bubble;
  const layerIndexRef = useRef(layerIndex);
  layerIndexRef.current = layerIndex;

  // バブルの位置は、どのレイヤーに居ても **universe（surface）座標の 1 つの空間**で持つ
  // （BubblesLayeredView は全バブルを surface レイヤーで place する）。
  // レイヤーが決めるのは**見た目の縮尺**だけなので、場合分けは要らない:
  //   位置 ⇄ style.left/top … universe の面（下の frame）で変換する
  //   画面の移動量 → モデル … その面の縮尺で割る（frame.atIndex(layerIndex)）
  const frameRef = useRef<Layer>(new Layer(0, { x: 0, y: 0 }, { x: 0, y: 0 }));
  frameRef.current = new Layer(0, surfaceLeftTop ?? { x: 0, y: 0 }, vanishingPoint ?? { x: 0, y: 0 });
  /** このバブルの見た目の縮尺を持つ面（画面の移動量・実寸の変換に使う） */
  const scaledFrame = () => frameRef.current.atIndex(layerIndex ?? 0);

  const startBubbleRef = useRef<Bubble | null>(null);
  const dragStartMouseRef = useRef<Point2 | null>(null);
  const currentBubbleRef = useRef<Bubble | null>(null);

  const handleDragging = (e: MouseEvent) => {
    if (!startBubbleRef.current || !dragStartMouseRef.current || !ref.current) return;
    const screenDelta = {
      x: e.clientX - dragStartMouseRef.current.x,
      y: e.clientY - dragStartMouseRef.current.y,
    };

    const frame = frameRef.current;
    const moved = startBubbleRef.current.moveBy(scaledFrame().scaleScreenDelta(screenDelta));
    // 「縁から外へ出さない」は Universe の規則。universe 座標で当ててから layer-local に戻す
    const clamped = frame.locate(createUniverse().clamp(frame.place(moved.position)));
    const next = moved.moveTo(clamped);
    currentBubbleRef.current = next;

    const topLeft = frame.place(next.position);
    const origin = scaledFrame().transformOriginFor(topLeft);
    ref.current.style.left = `${topLeft.x}px`;
    ref.current.style.top = `${topLeft.y}px`;
    ref.current.style.transition = "none";
    ref.current.style.transformOrigin = `${origin.x}px ${origin.y}px`;
  };

  const endDrag = () => {
    if (currentBubbleRef.current) {
      dispatch(updateBubble(currentBubbleRef.current.toJSON(), universeId));
    }
    if (ref.current) {
      ref.current.style.transition = "";
      ref.current.style.transformOrigin = "";
    }
    startBubbleRef.current = null;
    dragStartMouseRef.current = null;
    currentBubbleRef.current = null;
    document.removeEventListener("mousemove", handleDragging);
    document.removeEventListener("mouseup", endDrag);
  };

  const onDragStart = (e: { clientX: number; clientY: number; stopPropagation: () => void }) => {
    e.stopPropagation();
    const el = ref.current;
    if (!el) return;
    // 起点は画面に出ている実物から作る（bubble.position は未設定のとき {0,0} に化ける）
    startBubbleRef.current = bubbleRef.current.moveTo(
      frameRef.current.locate({
        x: parseFloat(el.style.left || "0") || 0,
        y: parseFloat(el.style.top || "0") || 0,
      }),
    );
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
