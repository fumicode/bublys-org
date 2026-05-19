"use client";
import { useRef, useContext, useCallback, useEffect } from "react";
import { useWindowSize } from "./useWindowSize.js";
import { SmartRect, CoordinateSystem } from "@bublys-org/bubbles-ui-util";
import { useAppSelector } from "@bublys-org/state-management";
import { selectRenderCount, selectIsLayerAnimating } from "../state/bubbles-slice.js";
import { BubblesContext } from "../bubble-routing/BubbleRouting.js";
import { useUniverseContext } from "../context/UniverseContext.js";

type useMyRectProps  = {
  onRectChanged?: (rect: SmartRect) => void;
}

// バッチ処理用のグローバルキュー - 読み取りと書き込みを分離
// universe rect も一緒に取得して、universe 相対座標を計算する
// 命名規則: _vp = screen 座標 (browser viewport 起点), _uv = universe 座標
type PendingUpdate = {
  el: HTMLElement;
  universeEl?: HTMLElement | null;
  callback: (bubbleRect_vp: DOMRect, universeRect_vp: DOMRect | null) => void;
};
let pendingUpdates: PendingUpdate[] = [];
let rafId: number | null = null;

const scheduleRectUpdate = (
  el: HTMLElement,
  universeEl: HTMLElement | null | undefined,
  callback: (bubbleRect_vp: DOMRect, universeRect_vp: DOMRect | null) => void
) => {
  pendingUpdates.push({ el, universeEl, callback });

  if (rafId === null) {
    rafId = requestAnimationFrame(() => {
      const updates = pendingUpdates;
      pendingUpdates = [];
      rafId = null;

      // ステップ1: 全要素の rect を一括で読み取り（1回のリフローで済む）
      const results = updates.map(({ el, universeEl }) => ({
        bubbleRect_vp: el.getBoundingClientRect(),
        universeRect_vp: universeEl ? universeEl.getBoundingClientRect() : null,
      }));

      // ステップ2: 読み取り完了後、全てのコールバックを実行
      updates.forEach(({ callback }, index) => {
        callback(results[index].bubbleRect_vp, results[index].universeRect_vp);
      });
    });
  }
};

export const useMyRectObserver = ({ onRectChanged }: useMyRectProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { coordinateSystem } = useContext(BubblesContext);
  const universeContext = useUniverseContext();
  const pageSize = useWindowSize();
  const renderCount = useAppSelector(selectRenderCount);
  const isLayerAnimating = useAppSelector(selectIsLayerAnimating);

  const coordinateSystemRef = useRef(coordinateSystem);
  coordinateSystemRef.current = coordinateSystem;
  const pageSizeRef = useRef(pageSize);
  pageSizeRef.current = pageSize;
  const onRectChangedRef = useRef(onRectChanged);
  onRectChangedRef.current = onRectChanged;

  const processRect = useCallback((bubbleRect_vp: DOMRect, universeRect_vp: DOMRect | null) => {
    const currentPageSize = pageSizeRef.current;
    const currentCoordinateSystem = coordinateSystemRef.current;

    // bubble.getBoundingClientRect() と universe.getBoundingClientRect() は
    // どちらも screen 座標 (_vp)。ネイティブスクロールで両者は同じだけ動くので、
    // 差分（= universe 座標 _uv）はスクロール不変。
    // universeRect が取れない場合（Provider 外）は screen 座標のまま扱う（後方互換）。
    const universeOffsetX = universeRect_vp ? universeRect_vp.x : 0;
    const universeOffsetY = universeRect_vp ? universeRect_vp.y : 0;
    const bubbleRect_uv = new DOMRect(
      bubbleRect_vp.x - universeOffsetX,
      bubbleRect_vp.y - universeOffsetY,
      bubbleRect_vp.width,
      bubbleRect_vp.height,
    );

    const globalRect = new SmartRect(bubbleRect_uv, currentPageSize, CoordinateSystem.GLOBAL.toData());
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
    scheduleRectUpdate(el, universeContext?.universeRef.current, processRect);
  }, [renderCount, pageSize, coordinateSystem, isLayerAnimating, processRect, universeContext]);

  // onTransitionEndで呼ばれる - バッチ処理でまとめて実行
  const notifyRendered = useCallback(() => {
    if (ref.current) {
      scheduleRectUpdate(ref.current, universeContext?.universeRef.current, processRect);
    }
  }, [processRect, universeContext]);

  return { ref, notifyRendered };
};
