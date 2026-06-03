"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ROOT_UNIVERSE_ID, BubbleArrangement } from "@bublys-org/bubbles-ui";
import {
  BUBBLE_ARRANGEMENT_TYPE,
  BUBBLE_ARRANGEMENT_ID,
} from "./bubbleArrangementDomain";
import { rootBrowserSnapshotCodec } from "./snapshot-url";
import { useUniverseArrangementWorldLine } from "./useUniverseArrangementWorldLine";

/** 現 location から「いま居るノード」を取り出す。"/" や "/universe" は null。 */
const parseNodeFromUrl = (): string | null => {
  if (typeof location === "undefined") return null;
  // location.pathname は先頭スラッシュ付き ("/universe@<node>")
  const segment = location.pathname.replace(/^\//, "");
  return rootBrowserSnapshotCodec.decode(segment);
};

/** node から root のブラウザ url を組み立てる（query/hash は維持）。 */
const buildRootPath = (node: string): string =>
  `/${rootBrowserSnapshotCodec.encode(node)}${location.search}${location.hash}`;

/**
 * root universe の BubbleArrangement と世界線を、ブラウザの URL と履歴に紐付ける。
 *
 * 中身は {@link useUniverseArrangementWorldLine}(ROOT_UNIVERSE_ID) を呼んだうえで、
 * その apex を **ブラウザのパス `/universe@<node>` + 履歴**にバインドする薄い
 * 特殊化。commit/rehydrate ループの実装はコア hook 側にしか書かれていない。
 *
 * 機能：
 *  - [URL push] apex が変わったら `/universe@<node>` を pushState
 *  - [popstate] ブラウザの戻る/進むで URL のノードへ moveTo
 *  - [self-heal] URL に乗っているが現グラフに無いノードは現 apex に揃える
 *  - [trail] 訪問トレイルを自前ミラーし undo/redo ボタンの活性を計算
 *    （ブラウザ履歴スタックは中身を読めないため）
 *
 * 通常ナビは「1本の線形タイムライン」として扱う（undo/redo ボタン = ブラウザの
 * 戻る/進む）。枝（他の世界線）は WorldLineGraph に保持され、DAG ビューからのみ
 * ジャンプできる。
 *
 * 注: DomainRegistryProvider の内側で使うこと。1 アプリにつき 1 回だけ呼ぶこと。
 */
export function useRootArrangementWorldLine() {
  const { apexId, scope } = useUniverseArrangementWorldLine(ROOT_UNIVERSE_ID);

  // moveTo は毎レンダー最新の graph を掴むので ref で保持
  // （popstate リスナーが古い graph を掴まないように）
  const moveToRef = useRef(scope.moveTo);
  moveToRef.current = scope.moveTo;
  // URL のノードがこのグラフに実在するか（stale/foreign な url で moveTo が
  // throw するのを防ぐ）。最新グラフを掴むため毎レンダー更新。
  const hasNodeRef = useRef<(id: string) => boolean>(() => false);
  hasNodeRef.current = (id: string) => !!scope.graph.state.nodes[id];
  // apex 変化が popstate（戻る/進む）由来かどうか。由来なら pushState しない。
  const fromPopstateRef = useRef(false);

  // 訪問トレイル（線形）: undo/redo ボタンの活性判定用。ブラウザ履歴スタックは
  // **中身を読めない**（length は取れるが現在位置は不明）ので、push/popstate を
  // 自前ミラーする。これにより nav.canUndo/canRedo が「ブラウザの戻る/進むが
  // 効くかどうか」と1対1で対応する。
  //
  // この判定は nest hook (`useUniverseArrangementWorldLine`) の DAG ベースの
  // canUndo/canRedo とは意図的に違う：root はブラウザ履歴モデル（前方切り捨て
  // あり）、nest は DAG モデル（枝分かれを保持）。詳しくは
  // docs/recursive-universe.md「C. root と nest で undo/redo の判断軸が違う」
  // を参照。
  const trailRef = useRef<string[]>([]);
  const indexRef = useRef(-1);
  const initializedRef = useRef(false);
  const [nav, setNav] = useState({ canUndo: false, canRedo: false });
  const refreshNav = useCallback(() => {
    setNav({
      canUndo: indexRef.current > 0,
      canRedo: indexRef.current < trailRef.current.length - 1,
    });
  }, []);

  // apex → URL（新規訪問なら push、popstate 由来なら何もしない）
  useEffect(() => {
    if (!apexId) return;
    const target = buildRootPath(apexId);

    if (!initializedRef.current) {
      initializedRef.current = true;
      const urlNode = parseNodeFromUrl();
      if (urlNode && urlNode !== apexId && hasNodeRef.current(urlNode)) {
        // ディープリンク: URL のノードへ移動（apex がまた変わるので次回に任せる）
        fromPopstateRef.current = true;
        trailRef.current = [urlNode];
        indexRef.current = 0;
        moveToRef.current(urlNode);
        refreshNav();
        return;
      }
      // 初回 or URL のノードが実在しない（stale url）: URL を現 apex に揃える
      // （履歴は置換してエントリを増やさない）
      history.replaceState({ node: apexId }, "", target);
      trailRef.current = [apexId];
      indexRef.current = 0;
      refreshNav();
      return;
    }

    if (fromPopstateRef.current) {
      fromPopstateRef.current = false;
      return;
    }
    if (location.pathname === `/${rootBrowserSnapshotCodec.encode(apexId)}`) return;

    // 新規訪問: 前方を切り捨てて push（線形に見せる。枝は graph 側に残る）
    history.pushState({ node: apexId }, "", target);
    trailRef.current = trailRef.current.slice(0, indexRef.current + 1);
    trailRef.current.push(apexId);
    indexRef.current = trailRef.current.length - 1;
    refreshNav();
  }, [apexId, refreshNav]);

  // popstate（ブラウザ/ボタンの戻る・進む）→ URL のノードへ moveTo
  useEffect(() => {
    const onPopstate = () => {
      const id = parseNodeFromUrl();
      if (!id || !hasNodeRef.current(id)) return; // 実在しないノードは無視（throw 回避）
      fromPopstateRef.current = true;
      moveToRef.current(id);
      const i = trailRef.current.indexOf(id);
      if (i >= 0) indexRef.current = i;
      refreshNav();
    };
    window.addEventListener("popstate", onPopstate);
    return () => window.removeEventListener("popstate", onPopstate);
  }, [refreshNav]);

  // undo/redo はブラウザ履歴に委譲（ボタン = ブラウザの戻る/進む）
  const moveBack = useCallback(() => history.back(), []);
  const moveForward = useCallback(() => history.forward(), []);

  // 各ノードの arrangement を要約（WorldLineView のノードラベル用）
  const summarizeNode = (nodeId: string): string => {
    const v = scope.getObjectAt<BubbleArrangement>(
      nodeId,
      BUBBLE_ARRANGEMENT_TYPE,
      BUBBLE_ARRANGEMENT_ID,
    );
    if (!v) return "";
    const count = Object.keys(v.bubbles ?? {}).length;
    return `${count}`;
  };

  return {
    moveBack,
    moveForward,
    // DAG パネルからの枝ジャンプ用（pushState 経由で線形トレイルの先端に積まれる）
    moveTo: scope.moveTo,
    canUndo: nav.canUndo,
    canRedo: nav.canRedo,
    graph: scope.graph,
    summarizeNode,
  };
}
