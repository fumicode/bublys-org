"use client";
import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  makeSelectBubbleArrangementForUniverse,
  replaceBubbleArrangement,
  navigateBubble,
  BubbleArrangement,
  type SnapshotCodec,
} from "@bublys-org/bubbles-ui";
import { useCasScope } from "@bublys-org/world-line-graph";
import { BUBBLE_ARRANGEMENT_TYPE, BUBBLE_ARRANGEMENT_ID } from "./bubbleArrangementDomain";

/**
 * 親バブル（この universe を表示しているバブル）への接続情報。
 *
 * `snapshot` は親バブルの url を「`<base>@<node>`」に出し入れする codec。
 * 呼び出し側（typically: BubbleRouteRegistry から自分のルート定義を引いた
 * UniverseBubble）が、ルートに紐付いた codec を渡す。これにより
 * useUniverseArrangementWorldLine は "universe" などの具体名を知らない。
 */
export type UniverseLink = {
  parentUniverseId: string;
  bubbleId: string;
  bubbleUrl: string;
  snapshot: SnapshotCodec;
};

/**
 * 任意の universe の BubbleArrangement を世界線に commit / 復元する**コア hook**。
 *
 * scope = universeId（universe ごとに独立した世界線）。
 *
 * `link` を渡すと、この universe の「現在ノード(apex)」を親バブルの url
 * (`<base>@<node>`) に双方向バインドする：
 *  - apex 変化 → 親バブルの url を更新（→ 親 view が変わり親世界線が記録 → …）
 *  - 親バブルの url 変化（親のブラウザ戻る等）→ その node へ moveTo（中身は rehydrate で反映）
 * `link.snapshot` から `<base>` 名（"universe"等）が来るので、hook はそれを知らない。
 *
 * root universe には `useRootArrangementWorldLine` が**この hook をラップして**
 * ブラウザ URL / 履歴調整を追加で乗せる。よって commit/rehydrate ループの実装は
 * この1ヶ所にしか書かれていない。
 *
 * 注: DomainRegistryProvider の内側で使うこと。1 universe につき 1 回だけ呼ぶこと
 *     （二重に呼ぶと commit/rehydrate が重複する）。
 */
export function useUniverseArrangementWorldLine(universeId: string, link?: UniverseLink) {
  const dispatch = useAppDispatch();
  const view = useAppSelector(makeSelectBubbleArrangementForUniverse(universeId));

  const scope = useCasScope(universeId, {
    initialObjects: [{ type: BUBBLE_ARRANGEMENT_TYPE, object: new BubbleArrangement(view) }],
  });

  const syncedSignatureRef = useRef<string | null>(JSON.stringify(view));

  // [commit] view 変化 → world-line に記録
  useEffect(() => {
    const signature = JSON.stringify(view);
    if (signature === syncedSignatureRef.current) return;
    syncedSignatureRef.current = signature;
    const shell = scope.getShell<BubbleArrangement>(BUBBLE_ARRANGEMENT_TYPE, BUBBLE_ARRANGEMENT_ID);
    if (shell) {
      shell.update(() => new BubbleArrangement(view));
    } else {
      scope.addObject(BUBBLE_ARRANGEMENT_TYPE, new BubbleArrangement(view));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // [rehydrate] apex 変化 → この universe に流し込む
  const apexId = scope.graph.getApex()?.id ?? null;
  useEffect(() => {
    const shell = scope.getShell<BubbleArrangement>(BUBBLE_ARRANGEMENT_TYPE, BUBBLE_ARRANGEMENT_ID);
    if (!shell) return;
    const incoming = shell.object.toJSON();
    const signature = JSON.stringify(incoming);
    if (signature === syncedSignatureRef.current) return;
    syncedSignatureRef.current = signature;
    dispatch(replaceBubbleArrangement(incoming, universeId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apexId]);

  // ============================================================
  // [URL バインド] apex ⇄ 親バブルの url（universe@<node>）
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
    const urlNode = link.snapshot.decode(link.bubbleUrl);

    if (apexId && apexId !== syncedNodeRef.current) {
      // 内部ナビ: apex が進んだ → url を追従させる
      syncedNodeRef.current = apexId;
      if (urlNode !== apexId) {
        dispatch(
          navigateBubble({ id: link.bubbleId, url: link.snapshot.encode(apexId) }, link.parentUniverseId)
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
    // nest 用 toolbar が直接使うショートカット（既存呼び出しと互換）。
    // canUndo/canRedo は DAG ベース（apex に parent/child が居るか）で、
    // moveBack/moveForward は DAG を辿る。root ラッパーはこれを使わずに
    // ブラウザ履歴ベースで自前計算する（意図的な非対称、docs の C 参照）。
    moveBack: scope.moveBack,
    moveForward: scope.moveForward,
    canUndo: scope.canUndo,
    canRedo: scope.canRedo,
    // root 特化ラッパー（useRootArrangementWorldLine）が追加 URL バインドのために使う
    apexId,
    scope,
  };
}
