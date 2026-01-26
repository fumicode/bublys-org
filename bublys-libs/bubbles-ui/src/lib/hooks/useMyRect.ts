"use client";
import { useRef, useContext, useCallback, useEffect } from "react";
import { useWindowSize } from "./useWindowSize.js";
import { SmartRect, CoordinateSystem } from "@bublys-org/bubbles-ui-util";
import { useAppSelector } from "@bublys-org/state-management";
import { selectRenderCount, selectIsLayerAnimating } from "../state/bubbles-slice.js";
import { BubblesContext } from "../bubble-routing/BubbleRouting.js";

type useMyRectProps  = {
  onRectChanged?: (rect: SmartRect) => void;
}

// バッチ処理用のグローバルキュー - 読み取りと書き込みを分離
type PendingUpdate = {
  el: HTMLElement;
  callback: (rect: DOMRect) => void;
};
let pendingUpdates: PendingUpdate[] = [];
let rafId: number | null = null;

const scheduleRectUpdate = (el: HTMLElement, callback: (rect: DOMRect) => void) => {
  pendingUpdates.push({ el, callback });

  if (rafId === null) {
    rafId = requestAnimationFrame(() => {
      const updates = pendingUpdates;
      pendingUpdates = [];
      rafId = null;

      // ステップ1: 全ての要素のrectを一括で読み取り（1回のリフローで済む）
      const rects = updates.map(({ el }) => el.getBoundingClientRect());

      // ステップ2: 読み取り完了後、全てのコールバックを実行
      updates.forEach(({ callback }, index) => {
        callback(rects[index]);
      });
    });
  }
};

export const useMyRectObserver = ({ onRectChanged }: useMyRectProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { coordinateSystem } = useContext(BubblesContext);
  const pageSize = useWindowSize();
  const renderCount = useAppSelector(selectRenderCount);
  const isLayerAnimating = useAppSelector(selectIsLayerAnimating);

  const coordinateSystemRef = useRef(coordinateSystem);
  coordinateSystemRef.current = coordinateSystem;
  const pageSizeRef = useRef(pageSize);
  pageSizeRef.current = pageSize;
  const onRectChangedRef = useRef(onRectChanged);
  onRectChangedRef.current = onRectChanged;

  const processRect = useCallback((domRect: DOMRect) => {
    const currentPageSize = pageSizeRef.current;
    const currentCoordinateSystem = coordinateSystemRef.current;

    const globalRect = new SmartRect(domRect, currentPageSize, CoordinateSystem.GLOBAL.toData());
    const localRect = globalRect.toLocal(currentCoordinateSystem);
    onRectChangedRef.current?.(localRect);
  }, []);

  // useEffect に変更（ペイント後に実行し、同期リフローを回避）
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!pageSize) return;
    // アニメーション中はrect更新をスキップ（中途半端な位置が保存されるのを防ぐ）
    if (isLayerAnimating) return;

    // バッチ処理にスケジュール
    scheduleRectUpdate(el, processRect);
  }, [renderCount, pageSize, coordinateSystem, isLayerAnimating, processRect]);

  // onTransitionEndで呼ばれる - バッチ処理でまとめて実行
  const notifyRendered = useCallback(() => {
    if (ref.current) {
      scheduleRectUpdate(ref.current, processRect);
    }
  }, [processRect]);

  return { ref, notifyRendered };
};
