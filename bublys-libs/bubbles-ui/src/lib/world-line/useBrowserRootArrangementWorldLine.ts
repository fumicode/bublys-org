"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { beginIntent } from "@bublys-org/world-line-graph";
import { BubbleArrangement } from "../BubbleArrangement.domain.js";
import { useAppDispatch } from "@bublys-org/state-management";
import {
  ROOT_UNIVERSE_ID,
  buildSeedArrangement,
  getInitialBubbleUrls,
  replaceBubbleArrangement,
} from "../state/bubbles-slice.js";
import type { SnapshotCodec } from "../bubble-routing/SnapshotCodec.js";
import {
  BUBBLE_ARRANGEMENT_TYPE,
  BUBBLE_ARRANGEMENT_ID,
} from "./bubbleArrangementDomain.js";
import { useUniverseArrangementWorldLine } from "./useUniverseArrangementWorldLine.js";

/**
 * root universe の BubbleArrangement と世界線を、ブラウザの URL と履歴に紐付ける。
 *
 * 中身は {@link useUniverseArrangementWorldLine}(ROOT_UNIVERSE_ID) を呼んだうえで、
 * その apex を **ブラウザのパス `/<codec.encode(node)>` + 履歴**にバインドする薄い
 * 特殊化。commit/rehydrate ループの実装はコア hook 側にしか書かれていない。
 *
 * 機能:
 *  - [URL push] apex が変わったら `/<codec.encode(node)>` を pushState
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
 *
 * @param codec ブラウザ url 用 SnapshotCodec。例えば
 *   `makeSnapshotCodec("universe")` を渡せば `/universe@<node>` 形式になる。
 *   バブリ側で別の base を使いたければ自由に注入可能。
 */
/**
 * ブラウザ履歴を「Next.js のルーターを経由せずに」書き換える。
 *
 * Next.js の App Router は `window.history.pushState` / `replaceState` に
 * パッチを当てて、外部からの URL 変更を自分のルート遷移として取り込む。
 * ここで書く `/<base>@<node>` は**アプリが持つ世界線ノードの表現**であって
 * Next のルートではないので、パッチではなくネイティブ実装を直接呼ぶ。
 *
 * パッチ経由のままだと、バブルを 1 個開くたびにルート遷移扱いになり、
 * dev では `ChunkLoadError: Failed to load chunk ...` を踏むことがある。
 */
/**
 * いまの履歴エントリの state を土台に、自分の情報を乗せる。
 *
 * Next.js の App Router は popstate で `event.state.__NA`（＝自分が作ったエントリ）が
 * 無いと `window.location.reload()` する。ルーターを経由せずに書くと、この印と
 * 内部ツリーが落ちて**戻る/進むがフルリロードになる**。
 * ここで作るのは Next のルート遷移ではなく世界線ノードの移動（同じページのまま）なので、
 * 現在のエントリの state をそのまま引き継いで印を保つ。
 */
const withCurrentHistoryState = (state: Record<string, unknown>): Record<string, unknown> => ({
  ...((window.history.state as Record<string, unknown> | null) ?? {}),
  ...state,
});

const pushHistoryState = (state: Record<string, unknown>, url: string): void => {
  History.prototype.pushState.call(window.history, withCurrentHistoryState(state), "", url);
};

const replaceHistoryState = (state: Record<string, unknown>, url: string): void => {
  History.prototype.replaceState.call(window.history, withCurrentHistoryState(state), "", url);
};

export function useBrowserRootArrangementWorldLine(codec: SnapshotCodec) {
  const dispatch = useAppDispatch();
  // commit で新しいノードが生まれた瞬間だけ履歴を積む。宣言順の都合で ref 経由にする
  const onCommittedRef = useRef<(nodeId: string) => void>(() => undefined);
  const { apexId, scope, restoresFromWorldLine } = useUniverseArrangementWorldLine(
    ROOT_UNIVERSE_ID,
    undefined,
    (nodeId) => onCommittedRef.current(nodeId),
  );

  // [seed] 復元するものが無いときだけ、設定済みの初期バブルを撒く。
  // 初期配置をスライスの initialState に埋め込むと、reducer が undefined state で
  // 呼ばれるたびに作り直されて復元済みの配置を上書きしてしまうため、ここで撒く。
  useEffect(() => {
    if (restoresFromWorldLine) return;
    const urls = getInitialBubbleUrls();
    if (!urls.length) return;
    dispatch(replaceBubbleArrangement(buildSeedArrangement(urls), ROOT_UNIVERSE_ID));
    // 初回だけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 現 location から「いま居るノード」を取り出す。 */
  const parseNodeFromUrl = (): string | null => {
    if (typeof location === "undefined") return null;
    // location.pathname は先頭スラッシュ付き
    const segment = location.pathname.replace(/^\//, "");
    return codec.decode(segment);
  };
  /** node から root のブラウザ url を組み立てる（query/hash は維持）。 */
  const buildRootPath = (node: string): string =>
    `/${codec.encode(node)}${location.search}${location.hash}`;

  // moveTo は毎レンダー最新の graph を掴むので ref で保持
  // （popstate リスナーが古い graph を掴まないように）
  const moveToRef = useRef(scope.moveTo);
  moveToRef.current = scope.moveTo;
  // URL のノードがこのグラフに実在するか（stale/foreign な url で moveTo が
  // throw するのを防ぐ）。最新グラフを掴むため毎レンダー更新。
  const hasNodeRef = useRef<(id: string) => boolean>(() => false);
  hasNodeRef.current = (id: string) => !!scope.graph.state.nodes[id];
  // 直前の現在地。apex の変化が「新ノードが生えた（commit）」のか
  // 「既存ノードへ移動した（moveTo）」のかを見分けるために持つ。
  const prevApexRef = useRef<string | null>(null);

  // 訪問トレイル（線形）: undo/redo ボタンの活性判定用。ブラウザ履歴スタックは
  // **中身を読めない**（length は取れるが現在位置は不明）ので、push/popstate を
  // 自前ミラーする。これにより nav.canUndo/canRedo が「ブラウザの戻る/進むが
  // 効くかどうか」と1対1で対応する。
  //
  // この判定は nest hook (`useUniverseArrangementWorldLine`) の DAG ベースの
  // canUndo/canRedo とは意図的に違う：root はブラウザ履歴モデル（前方切り捨て
  // あり）、nest は DAG モデル（枝分かれを保持）。
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

  // apex → URL。
  //
  // ルール: **URL は常に現 apex を指す（replace で自己修復）。履歴を積む(push)のは
  // 「直前の現在地から新しいノードが生えた」ときだけ**＝ユーザーの変更が commit された瞬間。
  // moveTo による移動（復元・打ち消しスナップ・popstate・遅れて届いた CAS）は
  // 現在地が既存ノードへ動いただけなので履歴を増やさない。
  // 起動中に URL が何度も書き換わり、履歴が起動途中の状態で埋まっていたのはここが原因だった。
  useEffect(() => {
    if (!apexId) return;
    const target = buildRootPath(apexId);
    prevApexRef.current = apexId;

    if (!initializedRef.current) {
      initializedRef.current = true;
      const urlNode = parseNodeFromUrl();
      if (urlNode && urlNode !== apexId && hasNodeRef.current(urlNode)) {
        // アドレスが先に動いている（ディープリンク/リロード）→ そこへ移るだけ。逆流させない
        trailRef.current = [urlNode];
        indexRef.current = 0;
        moveToRef.current(urlNode);
        refreshNav();
        return;
      }
      // 初回 or URL のノードが実在しない（stale url）: URL を現 apex に揃える
      replaceHistoryState({ node: apexId }, target);
      trailRef.current = [apexId];
      indexRef.current = 0;
      refreshNav();
      return;
    }

    if (location.pathname === `/${codec.encode(apexId)}`) return;

    // ここは「URL を現在地に合わせる」だけ。履歴を積むのは commit（onCommitted）と
    // DAG ジャンプ（jumpTo）の 2 箇所に限る。
    replaceHistoryState({ node: apexId }, target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apexId, refreshNav]);

  /** 履歴を 1 つ積んで現在地にする（commit / DAG ジャンプ共通） */
  const pushCurrent = useCallback(
    (nodeId: string) => {
      pushHistoryState({ node: nodeId }, buildRootPath(nodeId));
      trailRef.current = trailRef.current.slice(0, indexRef.current + 1);
      trailRef.current.push(nodeId);
      indexRef.current = trailRef.current.length - 1;
      refreshNav();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshNav],
  );

  // commit で新ノードが生まれた = ユーザーの変更が記録された。ここでだけ履歴が伸びる
  onCommittedRef.current = pushCurrent;

  // popstate（ブラウザ/ボタンの戻る・進む）→ URL のノードへ moveTo
  useEffect(() => {
    const onPopstate = () => {
      beginIntent(); // 戻る/進むもユーザーの 1 操作
      const id = parseNodeFromUrl();
      if (!id || !hasNodeRef.current(id)) return; // 実在しないノードは無視（throw 回避）
      moveToRef.current(id);
      const i = trailRef.current.indexOf(id);
      if (i >= 0) indexRef.current = i;
      refreshNav();
    };
    window.addEventListener("popstate", onPopstate);
    return () => window.removeEventListener("popstate", onPopstate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshNav]);

  /**
   * DAG 上の任意ノードへジャンプする（世界線グラフのクリック等）。
   * これは**ユーザーのナビゲーション**なので履歴を積む。
   * apex→URL の effect は「生えた」以外を replace するので、push はここが担当する。
   */
  const jumpTo = useCallback(
    (nodeId: string) => {
      if (!hasNodeRef.current(nodeId)) return;
      beginIntent(); // DAG のノードクリックもユーザーの 1 操作
      moveToRef.current(nodeId);
      pushCurrent(nodeId);
    },
    [pushCurrent],
  );

  // undo/redo はブラウザ履歴に委譲（ボタン = ブラウザの戻る/進む）
  const moveBack = useCallback(() => history.back(), []);
  const moveForward = useCallback(() => history.forward(), []);

  // 各ノードの arrangement を要約（WorldLineView のノードラベル用）。
  //
  // 素朴に毎ノード `scope.getObjectAt(nodeId)` を呼ぶと、内部で
  // `graph.getPathToNode(nodeId)` がノードを root から辿るため 1 ノードあたり
  // O(depth)。WorldLineView は N ノードに対して renderNodeSummary を 1 回ずつ
  // 呼ぶので、素朴な毎レンダー再評価は O(N²) になる。
  //
  // ここで graph / cas が変わったときだけ全ノード分の summary を 1 回作って
  // Map に詰めておき、renderNodeSummary は Map 引き O(1) で返す。これで頻繁な
  // 微小な再レンダー（例: finishBubbleAnimation dispatch）でも O(N²) 走査が
  // 起きなくなる。
  // 他ノードの中身を覗くので、evict 済みのぶんを先に埋めておくよう頼む
  // （オンデマンド取得はふだん「今いるノード」のぶんしか走らない）。
  const { requestNodes } = scope;
  useEffect(() => {
    requestNodes(Object.keys(scope.graph.state.nodes));
  }, [requestNodes, scope.graph]);

  const summaries = useMemo(() => {
    const map = new Map<string, string>();
    const nodes = scope.graph.state.nodes;
    for (const id of Object.keys(nodes)) {
      const v = scope.getObjectAt<BubbleArrangement>(id, BUBBLE_ARRANGEMENT_TYPE, BUBBLE_ARRANGEMENT_ID);
      map.set(id, v ? `${Object.keys(v.bubbles ?? {}).length}` : "");
    }
    return map;
    // scope.getObjectAt の dep が [graph, cas, registry] なので、これらが変わる
    // たびに getObjectAt の参照が更新される。それを再計算トリガーとして使う。
  }, [scope.graph, scope.getObjectAt]);

  const summarizeNode = useCallback(
    (nodeId: string): string => summaries.get(nodeId) ?? "",
    [summaries],
  );

  return {
    moveBack,
    moveForward,
    // DAG パネルからの枝ジャンプ用。これはユーザーのナビゲーションなので履歴を積む
    moveTo: jumpTo,
    canUndo: nav.canUndo,
    canRedo: nav.canRedo,
    graph: scope.graph,
    summarizeNode,
  };
}
