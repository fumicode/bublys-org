"use client";
import { useEffect, useRef } from "react";
import { useAppDispatch } from "@bublys-org/state-management";
import type { Size2 } from "@bublys-org/bubbles-ui-util";
import { Bubble } from "../Bubble.domain.js";
import { useUniverseId } from "../context/UniverseContext.js";
import { updateBubble } from "../state/bubbles-slice.js";

type UseBubbleResizeArgs = {
  bubble: Bubble;
  ref: React.RefObject<HTMLElement | null>;
};

const MIN_SIZE: Size2 = { width: 160, height: 100 };

/**
 * バブル右下のリサイズハンドル用 hook。
 *
 * 振る舞いは {@link useBubbleDrag} と対称的:
 *  - 開始時にバブルの実サイズ（getBoundingClientRect）を起点として記録
 *  - drag 中は DOM 直接操作で width/height を書き換え（transition off）
 *  - 終了時に 1 回だけ updateBubble を dispatch し、size を確定。
 *    同時に maximized: false を立てて「ユーザーがサイズを決めた」状態に遷移する
 *    （最大化状態だった場合はそれが解除される）
 */
export function useBubbleResize({ bubble, ref }: UseBubbleResizeArgs) {
  const dispatch = useAppDispatch();
  const universeId = useUniverseId();

  const bubbleRef = useRef(bubble);
  bubbleRef.current = bubble;

  const startSizeRef = useRef<Size2 | null>(null);
  const startMouseRef = useRef<{ x: number; y: number } | null>(null);
  const currentSizeRef = useRef<Size2 | null>(null);

  const handleResizing = (e: MouseEvent) => {
    if (!startSizeRef.current || !startMouseRef.current || !ref.current) return;
    const dx = e.clientX - startMouseRef.current.x;
    const dy = e.clientY - startMouseRef.current.y;
    const w = Math.max(MIN_SIZE.width, startSizeRef.current.width + dx);
    const h = Math.max(MIN_SIZE.height, startSizeRef.current.height + dy);
    currentSizeRef.current = { width: w, height: h };
    ref.current.style.width = `${w}px`;
    ref.current.style.height = `${h}px`;
    ref.current.style.transition = "none";
  };

  const endResize = () => {
    if (currentSizeRef.current) {
      const resized = bubbleRef.current.resizeTo(currentSizeRef.current);
      // 「ユーザーがサイズを決めた」状態 = maximized:false を明示的に立てる
      dispatch(updateBubble({ ...resized.toJSON(), maximized: false }, universeId));
    }
    if (ref.current) {
      ref.current.style.transition = "";
      ref.current.style.width = "";
      ref.current.style.height = "";
    }
    startSizeRef.current = null;
    startMouseRef.current = null;
    currentSizeRef.current = null;
    document.removeEventListener("mousemove", handleResizing);
    document.removeEventListener("mouseup", endResize);
  };

  const onResizeStart = (e: {
    clientX: number;
    clientY: number;
    stopPropagation: () => void;
    preventDefault?: () => void;
  }) => {
    e.stopPropagation();
    e.preventDefault?.();
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    startSizeRef.current = { width: rect.width, height: rect.height };
    startMouseRef.current = { x: e.clientX, y: e.clientY };
    document.addEventListener("mousemove", handleResizing);
    document.addEventListener("mouseup", endResize);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleResizing);
      document.removeEventListener("mouseup", endResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { onResizeStart };
}
