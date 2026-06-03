"use client";
import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  makeSelectBubbleViewStateForUniverse,
  replaceBubbleViewState,
  navigateBubble,
  BubbleViewState,
} from "@bublys-org/bubbles-ui";
import { useCasScope } from "@bublys-org/world-line-graph";
import { BUBBLE_VIEW_TYPE, BUBBLE_VIEW_ID } from "./bubbleViewDomain";
import { WL_URL_KEY } from "./wl-url";

const UNIVERSE_BASE = "universe";

/** ネスト universe の現在ノードを表す universe バブルの url を組み立てる。 */
export const buildUniverseUrl = (node?: string | null): string =>
  node ? `${UNIVERSE_BASE}?${WL_URL_KEY}=${node}` : UNIVERSE_BASE;

/** universe バブルの url から wl=<node> を読み取る。 */
export const readUniverseWl = (url: string): string | null => {
  const m = url.match(new RegExp(`[?&]${WL_URL_KEY}=([^&]+)`));
  return m ? m[1] : null;
};

/** 親バブル（この universe を表示しているバブル）への接続情報。 */
export type UniverseLink = {
  parentUniverseId: string;
  bubbleId: string;
  bubbleUrl: string;
};

/**
 * 任意の universe（特にネスト universe）の表示状態を world-line に commit / 復元し、
 * in-app の undo/redo を提供する。
 *
 * scope = universeId（universe ごとに独立した世界線）。
 *
 * `link` を渡すと、この universe の「現在ノード(apex)」を親バブルの url
 * (`universe?wl=<node>`) に双方向バインドする：
 *  - apex 変化 → 親バブルの url を更新（→ 親 view が変わり親世界線が記録 → … → root の #wl=）
 *  - 親バブルの url 変化（親のブラウザ戻る等）→ その node へ moveTo（中身は rehydrate で反映）
 * これにより「universe のアドレスは常に wl=<node>。root はブラウザ、ネストは親バブルの url」
 * という統一形が再帰的に成立する。
 *
 * 注: DomainRegistryProvider の内側で使うこと。1 universe につき 1 回だけ呼ぶこと
 *     （二重に呼ぶと commit/rehydrate が重複する）。
 */
export function useUniverseWorldLine(universeId: string, link?: UniverseLink) {
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

  // ============================================================
  // [URL バインド] apex ⇄ 親バブルの url（universe?wl=<node>）
  //
  // apex と url が「最後に合意したノード(syncedNodeRef)」から
  // どちらが離れたかで駆動方向を判定し、A/B が綱引きしないようにする：
  //  - apex が syncedNode から離れた → 内部ナビ。url を apex に追従（navigate）。
  //  - url が syncedNode から離れ、かつ apex とも違う → 外部ナビ（親の戻る等）。
  //    その node へ moveTo（中身は rehydrate が反映）。
  // これで seed/settle 中に apex が進んでも、遅れている url に引き戻されない。
  // ============================================================
  const bubbleUrl = link?.bubbleUrl;
  const syncedNodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!link) return;
    const urlNode = readUniverseWl(link.bubbleUrl);

    if (apexId && apexId !== syncedNodeRef.current) {
      // 内部ナビ: apex が進んだ → url を追従させる
      syncedNodeRef.current = apexId;
      if (urlNode !== apexId) {
        dispatch(
          navigateBubble({ id: link.bubbleId, url: buildUniverseUrl(apexId) }, link.parentUniverseId)
        );
      }
      return;
    }

    if (urlNode && urlNode !== syncedNodeRef.current && urlNode !== apexId) {
      // 外部ナビ: url が差し戻された → その node へ移動
      if (!scope.graph.state.nodes[urlNode]) return; // 未所持ノードは無視
      syncedNodeRef.current = urlNode;
      scope.moveTo(urlNode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apexId, bubbleUrl]);

  return {
    moveBack: scope.moveBack,
    moveForward: scope.moveForward,
    canUndo: scope.canUndo,
    canRedo: scope.canRedo,
  };
}
