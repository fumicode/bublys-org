"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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

const URL_KEY = "wl";

const parseNodeFromUrl = (): string | null => {
  if (typeof location === "undefined") return null;
  const m = location.hash.match(new RegExp(`${URL_KEY}=([^&]+)`));
  return m ? decodeURIComponent(m[1]) : null;
};

/**
 * bubble-ui の表示状態(arrangement)を world-line-graph に commit / 復元する橋渡し。
 *
 * - [commit] bubbleState(arrangement)が変わったら world-line に記録
 * - [rehydrate] apex が変わったら replaceBubbleViewState で Redux に流し込む
 * - [URL] apex ⇄ ブラウザ履歴。通常ナビは「1本の線形タイムライン」として扱う
 *   （undo/redo ボタン = ブラウザの戻る/進む）。枝（他の世界線）は
 *   WorldLineGraph に保持され、特別な DAG ビューからのみジャンプできる。
 *
 * 双方向の無限ループは「直近に同期した view の署名」で防ぐ。
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

  // ============================================================
  // [URL/線形ナビ] ブラウザ履歴を唯一の線形タイムラインにする
  // ============================================================

  // moveTo は毎レンダー最新の graph を掴むので ref で保持
  // （popstate リスナーが古い graph を掴まないように）
  const moveToRef = useRef(scope.moveTo);
  moveToRef.current = scope.moveTo;
  // apex 変化が popstate（戻る/進む）由来かどうか。由来なら pushState しない。
  const fromPopstateRef = useRef(false);

  // 訪問トレイル（線形）: undo/redo ボタンの活性判定用。
  // ブラウザ履歴スタックは中身を読めないので自前で push/pop をミラーする。
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
    const target = `#${URL_KEY}=${encodeURIComponent(apexId)}`;

    if (!initializedRef.current) {
      initializedRef.current = true;
      const urlNode = parseNodeFromUrl();
      if (urlNode && urlNode !== apexId) {
        // ディープリンク: URL のノードへ移動（apex がまた変わるので次回に任せる）
        fromPopstateRef.current = true;
        trailRef.current = [urlNode];
        indexRef.current = 0;
        moveToRef.current(urlNode);
        refreshNav();
        return;
      }
      // 初回: URL を現 apex に揃える（履歴は置換してエントリを増やさない）
      history.replaceState({ [URL_KEY]: apexId }, "", target);
      trailRef.current = [apexId];
      indexRef.current = 0;
      refreshNav();
      return;
    }

    if (fromPopstateRef.current) {
      fromPopstateRef.current = false;
      return;
    }
    if (location.hash === target) return;

    // 新規訪問: 前方を切り捨てて push（線形に見せる。枝は graph 側に残る）
    history.pushState({ [URL_KEY]: apexId }, "", target);
    trailRef.current = trailRef.current.slice(0, indexRef.current + 1);
    trailRef.current.push(apexId);
    indexRef.current = trailRef.current.length - 1;
    refreshNav();
  }, [apexId, refreshNav]);

  // popstate（ブラウザ/ボタンの戻る・進む）→ URL のノードへ moveTo
  useEffect(() => {
    const onPopstate = () => {
      const id = parseNodeFromUrl();
      if (!id) return;
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
