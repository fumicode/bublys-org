"use client";
import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  makeSelectBubbleViewStateForUniverse,
  replaceBubbleViewState,
  BubbleViewState,
} from "@bublys-org/bubbles-ui";
import { useCasScope } from "@bublys-org/world-line-graph";
import { BUBBLE_VIEW_TYPE, BUBBLE_VIEW_ID } from "./bubbleViewDomain";

/**
 * 任意の universe（特にネスト universe）の表示状態を world-line に commit / 復元し、
 * in-app の undo/redo を提供する。
 *
 * scope = universeId（universe ごとに独立した世界線）。
 * root と違いブラウザURLとは連動しない（URL は root の世界線が担う）。
 * ナビは世界線グラフの親子(moveBack/moveForward)を直接たどる。
 *
 * 注: DomainRegistryProvider の内側で使うこと。
 */
export function useUniverseWorldLine(universeId: string) {
  const dispatch = useAppDispatch();
  const view = useAppSelector(makeSelectBubbleViewStateForUniverse(universeId));

  const scope = useCasScope(universeId, {
    initialObjects: [{ type: BUBBLE_VIEW_TYPE, object: new BubbleViewState(view) }],
  });

  const syncedSignatureRef = useRef<string | null>(JSON.stringify(view));

  // [commit] view 変化 → world-line に記録
  useEffect(() => {
    const signature = JSON.stringify(view);
    if (signature === syncedSignatureRef.current) return;
    syncedSignatureRef.current = signature;
    const shell = scope.getShell<BubbleViewState>(BUBBLE_VIEW_TYPE, BUBBLE_VIEW_ID);
    if (shell) {
      shell.update(() => new BubbleViewState(view));
    } else {
      scope.addObject(BUBBLE_VIEW_TYPE, new BubbleViewState(view));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // [rehydrate] apex 変化 → この universe に流し込む
  const apexId = scope.graph.getApex()?.id ?? null;
  useEffect(() => {
    const shell = scope.getShell<BubbleViewState>(BUBBLE_VIEW_TYPE, BUBBLE_VIEW_ID);
    if (!shell) return;
    const incoming = shell.object.toJSON();
    const signature = JSON.stringify(incoming);
    if (signature === syncedSignatureRef.current) return;
    syncedSignatureRef.current = signature;
    dispatch(replaceBubbleViewState(incoming, universeId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apexId]);

  return {
    moveBack: scope.moveBack,
    moveForward: scope.moveForward,
    canUndo: scope.canUndo,
    canRedo: scope.canRedo,
  };
}
