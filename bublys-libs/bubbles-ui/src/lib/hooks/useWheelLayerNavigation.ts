"use client";
import { useRef, useCallback } from "react";
import { Bubble } from "../Bubble.domain.js";
import { acquireWheelLayerLock, useWheelLayerLockListener } from "./wheelLayerLock.js";

// ホイールの1ノッチ相当（多くのマウスは1クリックでdeltaY=100）。
// トラックパッドの細かいdeltaも積算し、閾値を超えるたびに1レイヤー分移動する。
const WHEEL_LAYER_THRESHOLD = 50;

type UseWheelLayerNavigationArgs = {
  bubble: Bubble;
  onLayerUpClick?: (bubble: Bubble) => void;
  onLayerDownClick?: (bubble: Bubble) => void;
};

/**
 * ヘッダー上でのマウスホイール操作でレイヤーを移動するhook。
 * 上スクロールで手前のレイヤーへ、下スクロールで奥のレイヤーへ移動する。
 *
 * ReactのonWheelはpassiveリスナーとして登録されるため、その中でpreventDefault()
 * を呼んでも無視され、背後のスクロールバーが動いてしまう。ここではcallback ref
 * でヘッダー要素に直接 { passive: false } のネイティブリスナーを張ることで、
 * デフォルトスクロールを確実に止める。
 *
 * また、ホイール操作中はレイヤー移動でバブルが拡大縮小しヘッダーがカーソル
 * 直下から動いてしまうため、{@link acquireWheelLayerLock} でこのバブルへの
 * 操作を一時的にロックし、カーソルがヘッダーから外れても操作を継続できるようにする。
 */
export function useWheelLayerNavigation({
  bubble,
  onLayerUpClick,
  onLayerDownClick,
}: UseWheelLayerNavigationArgs) {
  useWheelLayerLockListener();

  const accumulatedDeltaRef = useRef(0);

  const bubbleRef = useRef(bubble);
  bubbleRef.current = bubble;
  const onLayerUpClickRef = useRef(onLayerUpClick);
  onLayerUpClickRef.current = onLayerUpClick;
  const onLayerDownClickRef = useRef(onLayerDownClick);
  onLayerDownClickRef.current = onLayerDownClick;

  const processWheelDelta = useCallback((deltaY: number) => {
    if (!onLayerUpClickRef.current && !onLayerDownClickRef.current) return;

    accumulatedDeltaRef.current += deltaY;

    while (accumulatedDeltaRef.current <= -WHEEL_LAYER_THRESHOLD) {
      onLayerUpClickRef.current?.(bubbleRef.current);
      accumulatedDeltaRef.current += WHEEL_LAYER_THRESHOLD;
    }
    while (accumulatedDeltaRef.current >= WHEEL_LAYER_THRESHOLD) {
      onLayerDownClickRef.current?.(bubbleRef.current);
      accumulatedDeltaRef.current -= WHEEL_LAYER_THRESHOLD;
    }
  }, []);

  const cleanupRef = useRef<(() => void) | null>(null);

  const headerRef = useCallback(
    (node: HTMLElement | null) => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      if (!node) return;

      const onWheel = (e: WheelEvent) => {
        if (!onLayerUpClickRef.current && !onLayerDownClickRef.current) return;
        e.preventDefault();
        e.stopPropagation();

        acquireWheelLayerLock(processWheelDelta);
        processWheelDelta(e.deltaY);
      };

      node.addEventListener("wheel", onWheel, { passive: false });
      cleanupRef.current = () => node.removeEventListener("wheel", onWheel);
    },
    [processWheelDelta]
  );

  return { headerRef };
}
