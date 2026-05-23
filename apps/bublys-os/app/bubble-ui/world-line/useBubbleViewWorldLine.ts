"use client";
import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  selectBubbleViewState,
  replaceBubbleViewState,
  BubbleViewState,
} from "@bublys-org/bubbles-ui";
import { useCasScope } from "@bublys-org/world-line-graph";
import {
  BUBBLE_VIEW_TYPE,
  BUBBLE_VIEW_ID,
  BUBBLE_VIEW_SCOPE,
} from "./bubbleViewDomain";

/**
 * bubble-ui の表示状態(arrangement)を world-line-graph に commit / 復元する橋渡し。
 *
 * - [commit] bubbleState(arrangement)が変わったら addObject で world-line に記録
 * - [rehydrate] apex が変わったら replaceBubbleViewState で Redux に流し込む
 *
 * 双方向の無限ループは「直近に同期した view の署名」で防ぐ。
 * （commit した view と rehydrate される view は同一なので署名が一致して止まる）
 *
 * 注: DomainRegistryProvider の内側で使うこと。
 */
export function useBubbleViewWorldLine() {
  const dispatch = useAppDispatch();
  const view = useAppSelector(selectBubbleViewState);

  const scope = useCasScope(BUBBLE_VIEW_SCOPE, {
    initialObjects: [{ type: BUBBLE_VIEW_TYPE, object: new BubbleViewState(view) }],
  });

  // 直近に world-line と同期した view の署名。初期 view は initialObjects が
  // root として commit するので、最初の commit effect はスキップさせる。
  const syncedSignatureRef = useRef<string | null>(JSON.stringify(view));

  // [commit] view が変わったら world-line に記録（rehydrate 由来・重複は署名でスキップ）
  useEffect(() => {
    const signature = JSON.stringify(view);
    if (signature === syncedSignatureRef.current) return;
    syncedSignatureRef.current = signature;

    // 既存の view オブジェクトは update で更新する。
    // （addObject はキャッシュ済み shell を返し新 obj を無視するため、更新には使えない）
    const shell = scope.getShell<BubbleViewState>(BUBBLE_VIEW_TYPE, BUBBLE_VIEW_ID);
    if (shell) {
      shell.update(() => new BubbleViewState(view));
    } else {
      scope.addObject(BUBBLE_VIEW_TYPE, new BubbleViewState(view));
    }
    // scope は毎レンダー新インスタンスなので依存に入れない（view 駆動）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // [rehydrate] apex が変わったら、その view を Redux に流し込む
  const apexId = scope.graph.getApex()?.id ?? null;
  useEffect(() => {
    const shell = scope.getShell<BubbleViewState>(BUBBLE_VIEW_TYPE, BUBBLE_VIEW_ID);
    if (!shell) return;
    const incoming = shell.object.toJSON();
    const signature = JSON.stringify(incoming);
    if (signature === syncedSignatureRef.current) return;
    syncedSignatureRef.current = signature;
    dispatch(replaceBubbleViewState(incoming));
    // apexId の変化のみで発火させる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apexId]);

  // 各ノードの arrangement を要約（WorldLineView のノードラベル用）
  const summarizeNode = (nodeId: string): string => {
    const v = scope.getObjectAt<BubbleViewState>(
      nodeId,
      BUBBLE_VIEW_TYPE,
      BUBBLE_VIEW_ID,
    );
    if (!v) return "";
    const count = Object.keys(v.bubbles ?? {}).length;
    return `${count}`;
  };

  return {
    moveBack: scope.moveBack,
    moveForward: scope.moveForward,
    moveTo: scope.moveTo,
    canUndo: scope.canUndo,
    canRedo: scope.canRedo,
    graph: scope.graph,
    summarizeNode,
  };
}
