"use client";
import { useLayoutEffect, useRef, useContext, useCallback } from "react";
import { useWindowSize } from "./01_useWindowSize";
import { SmartRect, CoordinateSystem } from "@bublys-org/bubbles-ui";
import { useAppSelector } from "@bublys-org/state-management";
import { selectRenderCount, selectIsLayerAnimating } from "@bublys-org/bubbles-ui-state";
import { BubblesContext } from "../BubblesUI/domain/BubblesContext";

type useMyRectProps  = {
  onRectChanged?: (rect: SmartRect) => void;
}

// バッチ処理用のグローバルキュー
// 複数のsaveRectを1つのrequestAnimationFrameでまとめて処理
let pendingRectUpdates: Array<() => void> = [];
let rafId: number | null = null;

const scheduleRectUpdate = (callback: () => void) => {
  pendingRectUpdates.push(callback);

  if (rafId === null) {
    rafId = requestAnimationFrame(() => {
      const updates = pendingRectUpdates;
      pendingRectUpdates = [];
      rafId = null;

      // 全ての更新を一度に実行（1回のリフローで済む）
      updates.forEach(update => update());
    });
  }
};

export const useMyRectObserver = ({ onRectChanged }: useMyRectProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { coordinateSystem } = useContext(BubblesContext);

  //うまく取れてない
  const pageSize = useWindowSize();

  const renderCount = useAppSelector(selectRenderCount);
  const isLayerAnimating = useAppSelector(selectIsLayerAnimating);

  // refで最新値を保持（クロージャの問題を回避）
  const coordinateSystemRef = useRef(coordinateSystem);
  coordinateSystemRef.current = coordinateSystem;
  const pageSizeRef = useRef(pageSize);
  pageSizeRef.current = pageSize;
  const onRectChangedRef = useRef(onRectChanged);
  onRectChangedRef.current = onRectChanged;

  const saveRect = useCallback(() => {
    if(!ref.current){
      return;
    }

    const currentPageSize = pageSizeRef.current;
    const currentCoordinateSystem = coordinateSystemRef.current;

    // getBoundingClientRect()はグローバル座標を返すので、まずグローバル座標系でSmartRectを作成
    const globalRect = new SmartRect(ref.current.getBoundingClientRect(), currentPageSize, CoordinateSystem.GLOBAL.toData());
    // その後、ローカル座標系に変換
    const localRect = globalRect.toLocal(currentCoordinateSystem);
    onRectChangedRef.current?.(localRect);
  }, []);


  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!pageSize) return;
    // アニメーション中はrect更新をスキップ（中途半端な位置が保存されるのを防ぐ）
    if (isLayerAnimating) return;


    saveRect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderCount, pageSize, coordinateSystem, isLayerAnimating]);


  // onTransitionEndで呼ばれる - バッチ処理でまとめて実行
  const notifyRendered = useCallback(() => {
    scheduleRectUpdate(saveRect);
  }, [saveRect]);


  return { ref, notifyRendered };
};
