"use client";
import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector, useAppStore } from "@bublys-org/state-management";
import { useCasScope } from "@bublys-org/world-line-graph";
import { BubbleArrangement } from "../BubbleArrangement.domain.js";
import {
  makeSelectBubbleArrangementForUniverse,
  replaceBubbleArrangement,
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
   * この universe が世界線から復元されるか（= seed してはいけないか）を
   * **マウント時に 1 回だけ**判定する。
   *
   * bubbles スライスは永続化されないので、リロード直後の universe は必ず空で始まる。
   * そこで seed を撒くと「seed だけの状態」が commit されて apex が進み、
   * 復元すべきノードを追い越して上書きしてしまう（中に開いていたバブルが消える）。
   *
   * ルール: **復元できる状態があるなら seed しない。seed は本当に空の universe だけ。**
   */
  const restoresFromWorldLineRef = useRef<boolean | null>(null);
  if (restoresFromWorldLineRef.current === null) {
    // 判定材料は 2 つ。どちらかが立てば「復元される」:
    //  - 親バブルの url がノードを指している（nest universe。マウント時に必ず読める）
    //  - 世界線にノードがある（root universe など）
    // shell（apex の実体）はマウント時点では引けないことがあるので使わない。
    const urlNode = link ? link.snapshot.decode(link.bubbleUrl) : null;
    restoresFromWorldLineRef.current =
      !!urlNode || Object.keys(scope.graph.state.nodes ?? {}).length > 0;
  }
  const restoresFromWorldLine = restoresFromWorldLineRef.current;

  const onCommittedRef = useRef(onCommitted);
  onCommittedRef.current = onCommitted;

  const linkRef = useRef(link);
  linkRef.current = link;

  /** 宣言順の都合で ref 越しに呼ぶ（実体は下の writeAddress） */
  const writeAddressRef = useRef<(nodeId: string) => void>(() => undefined);

  const syncedSignatureRef = useRef<string | null>(JSON.stringify(view));

  /**
   * 復元が済んだか。**起動は「変更」ではない**ので、復元が流れ込むまでは commit しない。
   *
   * リロード直後の universe は空から始まり、そこへ復元が届くまでの間に
   * 何段階か view が動く（seed・レイアウト調整など）。これをそのまま記録すると、
   * 起動のたびに世界線ノードが増え、apex が進み、URL が何度も書き換わる
   * （`universe@xxxx` のチラつき）。しかも push なのでブラウザ履歴まで汚れる。
   *
   * 復元するものが無い universe は最初から「済」でよい。
   */
  const restoredRef = useRef(!restoresFromWorldLine);

  // [commit] view 変化 → world-line に記録
  useEffect(() => {
    if (!isDriver()) return;
    const signature = JSON.stringify(view);
    if (signature === syncedSignatureRef.current) return;
    // 復元前の途中経過は記録しない（syncedSignature も進めない。復元後の差分検知に使う）
    if (!restoredRef.current) return;
    syncedSignatureRef.current = signature;
    const shell = scope.getShell<BubbleArrangement>(BUBBLE_ARRANGEMENT_TYPE, BUBBLE_ARRANGEMENT_ID);
    const graphsBefore = store.getState().worldLineGraph?.graphs ?? {};
    const nodesBefore = graphsBefore[universeId]?.nodes ?? {};
    if (shell) {
      shell.update(() => new BubbleArrangement(view));
    } else {
      scope.addObject(BUBBLE_ARRANGEMENT_TYPE, new BubbleArrangement(view));
    }
    // grow は同期 dispatch なので、直後の store が結果を持っている。
    // 打ち消しスナップ（同じ内容の既存ノードへ吸収）では apex は動くがノードは増えない。
    // 「ノードが新しく生まれた」ときだけ通知する ＝ 履歴を積んでよい唯一の瞬間。
    const graphsAfter = store.getState().worldLineGraph?.graphs ?? {};
    const after = graphsAfter[universeId]?.apexNodeId ?? null;
    if (after && !nodesBefore[after]) {
      writeAddressRef.current(after);
      onCommittedRef.current?.(after);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // [rehydrate] apex 変化 → この universe に流し込む
  const apexId = scope.graph.getApex()?.id ?? null;
  useEffect(() => {
    if (!isDriver()) return;
    const shell = scope.getShell<BubbleArrangement>(BUBBLE_ARRANGEMENT_TYPE, BUBBLE_ARRANGEMENT_ID);
    // 復元元が無い＝復元は起きない。commit の抑止を解いておく
    if (!shell) {
      restoredRef.current = true;
      return;
    }
    const incoming = shell.object.toJSON();
    const signature = JSON.stringify(incoming);
    if (signature === syncedSignatureRef.current) {
      restoredRef.current = true;
      return;
    }
    syncedSignatureRef.current = signature;
    dispatch(replaceBubbleArrangement(incoming, universeId));
    restoredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apexId]);

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
