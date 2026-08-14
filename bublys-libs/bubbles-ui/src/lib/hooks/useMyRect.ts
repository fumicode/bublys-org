"use client";
import { useRef, useContext, useCallback, useEffect } from "react";
import { useWindowSize } from "./useWindowSize.js";
import { SmartRect, CoordinateSystem, Viewport } from "@bublys-org/bubbles-ui-util";
import { useAppSelector } from "@bublys-org/state-management";
import { selectRenderCount, selectIsLayerAnimating } from "../state/bubbles-slice.js";
import { BubblesContext } from "../bubble-routing/BubbleRouting.js";
import { useUniverseContext } from "../context/UniverseContext.js";

type useMyRectProps  = {
  onRectChanged?: (rect: SmartRect) => void;
}

// バッチ処理用のグローバルキュー - 読み取りと書き込みを分離。
// universe / スクロール容器の rect も一括取得し Viewport を構築して
// screen → universe 変換に使う（生の座標減算は Viewport に集約）。
type PendingUpdate = {
  el: HTMLElement;
  universeEl?: HTMLElement | null;
  callback: (bubbleScreenRect: DOMRect, viewport: Viewport | null) => void;
};
let pendingUpdates: PendingUpdate[] = [];
let rafId: number | null = null;

const scheduleRectUpdate = (
  el: HTMLElement,
  universeEl: HTMLElement | null | undefined,
  callback: (bubbleScreenRect: DOMRect, viewport: Viewport | null) => void
) => {
  pendingUpdates.push({ el, universeEl, callback });

  if (rafId === null) {
    rafId = requestAnimationFrame(() => {
      const updates = pendingUpdates;
      pendingUpdates = [];
      rafId = null;

      // ステップ1: 全要素の rect を一括で読み取り（1回のリフローで済む）
      const results = updates.map(({ el, universeEl }) => {
        const bubbleScreenRect = el.getBoundingClientRect();
        // universe の親 = スクロール容器(StyledViewport)
        const scrollEl = universeEl?.parentElement ?? null;
        let viewport: Viewport | null = null;
        if (universeEl && scrollEl) {
          // universe バブル自身が root の奥のレイヤーに居ると CSS scale が効くので
          // bbcr.width / offsetWidth で推定して Viewport に渡す（screen⇄universe
          // 変換と viewport.size をその scale ぶん補正）。
          const universeBbcr = universeEl.getBoundingClientRect();
          const intrinsicW = universeEl.offsetWidth;
          const parentScale = intrinsicW > 0 ? universeBbcr.width / intrinsicW : 1;
          viewport = Viewport.fromMeasuredRects(
            universeBbcr,
            scrollEl.getBoundingClientRect(),
            parentScale,
          );
        }
        return { bubbleScreenRect, viewport };
      });

      // ステップ2: 読み取り完了後、全てのコールバックを実行
      updates.forEach(({ callback }, index) => {
        callback(results[index].bubbleScreenRect, results[index].viewport);
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

  const processRect = useCallback((bubbleScreenRect: DOMRect, viewport: Viewport | null) => {
    const currentPageSize = pageSizeRef.current;
    const currentCoordinateSystem = coordinateSystemRef.current;

    // screen 座標 → universe 座標。Viewport がスクロール不変な変換を担う。
    // Viewport が無い場合（Provider 外）は screen 座標のまま扱う（後方互換）。
    const topLeftUniverse = viewport
      ? viewport.screenToUniverse({ x: bubbleScreenRect.x, y: bubbleScreenRect.y })
      : { x: bubbleScreenRect.x, y: bubbleScreenRect.y };
    // bbcr の width/height も screen pixel（親 scale 込み）なので universe 単位に直す。
    const bubbleUniverseSize = viewport
      ? viewport.screenSizeToUniverse({ width: bubbleScreenRect.width, height: bubbleScreenRect.height })
      : { width: bubbleScreenRect.width, height: bubbleScreenRect.height };
    const bubbleUniverseRect = new DOMRect(
      topLeftUniverse.x,
      topLeftUniverse.y,
      bubbleUniverseSize.width,
      bubbleUniverseSize.height,
    );

    // 親サイズ = SmartRect の空きスペース/隅領域計算の基準。ネスト universe の中では
    // ネスト viewport のピクセルサイズを使う（root の window size だと popChild 位置が
    // ネスト viewport の外＝root の右上などに飛ぶ）。Viewport が無い場合は従来通り。
    const parentSize = viewport ? viewport.size : currentPageSize;
    const globalRect = new SmartRect(bubbleUniverseRect, parentSize, CoordinateSystem.GLOBAL.toData());
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
