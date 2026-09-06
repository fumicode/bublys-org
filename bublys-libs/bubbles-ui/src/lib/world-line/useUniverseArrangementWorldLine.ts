"use client";
import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector, useAppStore } from "@bublys-org/state-management";
import { useCasScope } from "@bublys-org/world-line-graph";
import { beginIntent } from "@bublys-org/world-line-graph";
import { BubbleArrangement } from "../BubbleArrangement.domain.js";
import {
  makeSelectBubbleArrangementForUniverse,
  makeSelectProjectedNodeId,
  projectUniverse,
  markProjected,
  navigateBubble,
} from "../state/bubbles-slice.js";
import type { SnapshotCodec } from "../bubble-routing/SnapshotCodec.js";
import { BUBBLE_ARRANGEMENT_TYPE, BUBBLE_ARRANGEMENT_ID } from "./bubbleArrangementDomain.js";

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
 * root universe は別途このコアをラップしてブラウザ URL / 履歴調整を追加で乗せる
 * （アプリ側の useRootArrangementWorldLine 等）。よって commit/rehydrate ループの
 * 実装はこの 1 ヶ所にしか書かれていない。
 *
 * 注: DomainRegistryProvider の内側で使うこと。1 universe につき 1 回だけ呼ぶこと
 *     （二重に呼ぶと commit/rehydrate が重複する）。
 */
/**
 * universe ごとの「世界線を駆動している hook インスタンス」。
 *
 * 同じ universe が複数箇所で描かれる（奥のレイヤーの縮小コピー等）と、この hook が
 * 2 つ走って commit / rehydrate / url バインドが二重になる。実測では、同じ universe
 * バブルの url を 2 インスタンスが交互に書き換え合い、そのたびに親の配置が変わって
 * commit → URL push、という往復が起きていた。
 *
 * 先にマウントした 1 つだけを駆動役にし、他は描画専用にする。
 */
const universeDrivers = new Map<string, symbol>();

export function useUniverseArrangementWorldLine(
  universeId: string,
  link?: UniverseLink,
  /**
   * commit で**新しいノードが生まれた**ときだけ呼ばれる。
   * 「現在地が動いた」ではなく「変更が記録された」の合図なので、
   * 履歴を積む（pushState）のはこれを受け取った側の責任。
   */
  onCommitted?: (nodeId: string) => void,
) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const view = useAppSelector(makeSelectBubbleArrangementForUniverse(universeId));

  // initialObjects は渡さない。
  // `view` はリロード直後は必ず空なので、世界線を持たない universe では
  // 「空の配置」が root ノードとして焼かれてしまう（起動しただけで apex が立ち、
  // 親バブルの url 書き換え → 親の配置変化 → commit → URL push の連鎖が始まる）。
  // universe の最初のノードは、seed（＝復元するものが無いとき）の commit で作る。
  const scope = useCasScope(universeId);

  // この universe の駆動役かどうか。空いていれば自分が取る
  const driverTokenRef = useRef<symbol | null>(null);
  if (driverTokenRef.current === null) driverTokenRef.current = Symbol(universeId);
  const isDriver = (): boolean => {
    const current = universeDrivers.get(universeId);
    if (!current) {
      universeDrivers.set(universeId, driverTokenRef.current as symbol);
      return true;
    }
    return current === driverTokenRef.current;
  };
  useEffect(
    () => () => {
      if (universeDrivers.get(universeId) === driverTokenRef.current) universeDrivers.delete(universeId);
    },
    [universeId],
  );

  /**
   * seed 判定専用: この universe は世界線から復元されるか。
   * commit の可否はもう ref ではなく projectedNodeId が決めるので、この値は
   * 「初期バブルを撒いてよいか」だけに使う（復元されるなら撒かない）。
   */
  const restoresFromWorldLineRef = useRef<boolean | null>(null);
  if (restoresFromWorldLineRef.current === null) {
    const urlNode = link ? link.snapshot.decode(link.bubbleUrl) : null;
    restoresFromWorldLineRef.current =
      !!urlNode || Object.keys(scope.graph.state.nodes ?? {}).length > 0;
  }
  const restoresFromWorldLine = restoresFromWorldLineRef.current;

  /** この配置が「どのノードの投影か」。null = まだ投影されていない = 読み取り専用 */
  const projectedNodeId = useAppSelector(makeSelectProjectedNodeId(universeId));
  const apexId = scope.graph.getApex()?.id ?? null;

  const onCommittedRef = useRef(onCommitted);
  onCommittedRef.current = onCommitted;

  const linkRef = useRef(link);
  linkRef.current = link;

  /** 宣言順の都合で ref 越しに呼ぶ（実体は下の writeAddress） */
  const writeAddressRef = useRef<(nodeId: string) => void>(() => undefined);

  // ============================================================
  // [投影] 世界線 → 配置。無条件・常時。
  //
  // 現在地（apex）が指すノードの中身を配置に流し込み、「どのノードの投影か」を
  // 同じ 1 アクションで書く。CAS がまだ届いていない（shell が引けない）ときは
  // 何もしない — 届いた瞬間に getShell の参照が変わって再実行される。
  // ============================================================
  useEffect(() => {
    if (!isDriver()) return;
    if (!apexId || projectedNodeId === apexId) return;
    const shell = scope.getShell<BubbleArrangement>(BUBBLE_ARRANGEMENT_TYPE, BUBBLE_ARRANGEMENT_ID);
    if (!shell) return;
    dispatch(projectUniverse({ arrangement: shell.object.toJSON(), nodeId: apexId }, universeId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apexId, projectedNodeId, scope.getShell]);

  // ============================================================
  // [commit] 配置 → 世界線。**投影済みのときだけ**。
  //
  // 「起動は変更ではない」を時刻(ref)ではなく値(projectedNodeId)で表す。
  // 投影が済んでいない universe は読み取り専用なので、起動途中の配置は記録されない。
  // 投影直後は定義上 view == 世界線[apex] なので、復元をそのまま記録し返すことも起きない。
  // 世界線をまだ持たない universe（apex なし）は、ここが最初のノードを作る（genesis）。
  // ============================================================
  useEffect(() => {
    if (!isDriver()) return;
    const projected = apexId === null ? true : projectedNodeId === apexId;
    if (!projected) return;

    const shell = scope.getShell<BubbleArrangement>(BUBBLE_ARRANGEMENT_TYPE, BUBBLE_ARRANGEMENT_ID);
    // store の型は注入スライスを optional に持つため、セレクタ用に絞り込む
    const latest = makeSelectBubbleArrangementForUniverse(universeId)(
      store.getState() as Parameters<ReturnType<typeof makeSelectBubbleArrangementForUniverse>>[0],
    );
    if (shell && JSON.stringify(shell.object.toJSON()) === JSON.stringify(latest)) return;
    if (!shell && Object.keys(latest.bubbles).length === 0) return; // 空 universe は焼かない

    const nodesBefore = store.getState().worldLineGraph?.graphs?.[universeId]?.nodes ?? {};
    if (shell) {
      shell.update(() => new BubbleArrangement(latest));
    } else {
      scope.addObject(BUBBLE_ARRANGEMENT_TYPE, new BubbleArrangement(latest));
    }

    // grow は同期 dispatch。直後の store が結果を持っている。
    const after = store.getState().worldLineGraph?.graphs?.[universeId]?.apexNodeId ?? null;
    if (!after) return;
    dispatch(markProjected(after, universeId)); // 配置は今まさに焼いた中身 = このノードの投影
    if (!nodesBefore[after]) {
      // ノードが新しく生まれた = ユーザーの変更が記録された唯一の瞬間
      writeAddressRef.current(after);
      onCommittedRef.current?.(after);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, projectedNodeId, apexId]);

  // ============================================================
  // [アドレス ⇄ 現在地]
  //
  // ルール: **アドレス（親バブルの url）が先に動いたら、そこへ moveTo するだけ。逆流させない。**
  // 逆向き（現在地 → アドレス）を書くのは 2 つの原因の場所だけ:
  //   - commit で新しいノードが生まれたとき（下の commit effect から）
  //   - nav 動詞（←/→ / DAG ジャンプ）を呼んだとき（下のラッパから）
  // apex の変化を無条件に url へ追従させると、起動中の現在地の移動まで
  // 親の配置変更として書き戻され、root まで波及して URL が何度も書き換わる。
  // ============================================================
  const bubbleUrl = link?.bubbleUrl;

  useEffect(() => {
    if (!link || !isDriver()) return;
    const urlNode = link.snapshot.decode(link.bubbleUrl);
    if (!urlNode || urlNode === apexId) return;
    if (!scope.graph.state.nodes[urlNode]) return; // 未所持ノードは無視
    scope.moveTo(urlNode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bubbleUrl, apexId]);

  /** 現在地をアドレス（親バブルの url）に書き戻す。原因の場所からだけ呼ぶ */
  const writeAddress = useCallback(
    (nodeId: string) => {
      if (!linkRef.current) return;
      const l = linkRef.current;
      if (l.snapshot.decode(l.bubbleUrl) === nodeId) return;
      dispatch(navigateBubble({ id: l.bubbleId, url: l.snapshot.encode(nodeId) }, l.parentUniverseId));
    },
    [dispatch],
  );

  /** nav 動詞（←/→ / ジャンプ）: 移動したら、その現在地をアドレスに書く */
  const navigate = useCallback(
    (run: () => void) => {
      beginIntent(); // nest の ←/→ もユーザーの 1 操作
      run();
      const apex = store.getState().worldLineGraph?.graphs?.[universeId]?.apexNodeId ?? null;
      if (apex) writeAddress(apex);
    },
    [store, universeId, writeAddress],
  );

  writeAddressRef.current = writeAddress;

  const moveBack = useCallback(() => navigate(() => scope.moveBack()), [navigate, scope]);
  const moveForward = useCallback(() => navigate(() => scope.moveForward()), [navigate, scope]);
  const moveTo = useCallback((nodeId: string) => navigate(() => scope.moveTo(nodeId)), [navigate, scope]);

  return {
    // nest 用 toolbar が直接使うショートカット（既存呼び出しと互換）。
    // canUndo/canRedo は DAG ベース（apex に parent/child が居るか）で、
    // moveBack/moveForward は DAG を辿る。root ラッパーはこれを使わずに
    // ブラウザ履歴ベースで自前計算する（意図的な非対称、docs の C 参照）。
    moveBack,
    moveForward,
    moveTo,
    canUndo: scope.canUndo,
    canRedo: scope.canRedo,
    // root 特化ラッパー（useRootArrangementWorldLine）が追加 URL バインドのために使う
    apexId,
    scope,
    /** 世界線から復元される universe か。true のとき呼び出し側は seed してはいけない */
    restoresFromWorldLine,
  };
}
