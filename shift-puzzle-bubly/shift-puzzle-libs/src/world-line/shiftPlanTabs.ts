/**
 * shift-plan world-line タブ操作
 *
 * - スコープ単位: 1 ShiftPlan = 1 scope（`shift-plan:${planId}`）
 * - タブ = ラベル付き WorldNode
 *
 * Thunk として書いているのは getState/dispatch を組み合わせて
 * 「graph 読む → 加工 → graph 書く＋ shift-plan 復元」を一連で行うため。
 */
import type { Dispatch } from "@reduxjs/toolkit";
import type { AppStore, RootState } from "@bublys-org/state-management";
import {
  WorldLineGraph,
  setGraph,
  type WorldNode,
} from "@bublys-org/world-line-graph";
import type { ShiftState } from "@bublys-org/shift-puzzle-model";
import { TimeSchedule } from "@bublys-org/shift-puzzle-model";
import { restoreShiftPlanFromWorldLine } from "../slice/shift-plan-slice.js";

// store.getState() の戻り型は LazyLoadedSlices を optional 扱いするため、
// 厳格な RootState ではなく実 store の戻り型に合わせる。
type RootStateActual = ReturnType<AppStore["getState"]>;
type GetState = () => RootStateActual;

// ========== スコープ ==========

const SHIFT_TYPE = "Shift";
export const shiftPlanScopeId = (planId: string) => `shift-plan:${planId}`;

// ========== Selectors ==========

/** スコープのグラフを取得（無ければ空） */
export const selectShiftPlanGraph = (
  state: RootState,
  planId: string
): WorldLineGraph => {
  const json = state.worldLineGraph?.graphs[shiftPlanScopeId(planId)];
  return json ? WorldLineGraph.fromJSON(json) : WorldLineGraph.empty();
};

/** タブ（ラベル付きノード）一覧を timestamp 昇順で取得 */
export const selectShiftPlanTabs = (
  state: RootState,
  planId: string
): WorldNode[] => {
  const graph = selectShiftPlanGraph(state, planId);
  return graph
    .getLabeledNodes()
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp);
};

/** 現在 apex のノード ID（無ければ null） */
export const selectCurrentApexNodeId = (
  state: RootState,
  planId: string
): string | null => selectShiftPlanGraph(state, planId).state.apexNodeId;

/**
 * 任意ノード時点の Shift state 一覧を CAS から復元して返す（比較用途）。
 * 該当 hash が CAS に無いものはスキップする。
 */
export const selectShiftsAtNode = (
  state: RootState,
  planId: string,
  nodeId: string | null
): ShiftState[] => {
  if (!nodeId) return [];
  const graph = selectShiftPlanGraph(state, planId);
  if (!graph.state.nodes[nodeId]) return [];
  const cas = state.worldLineGraph?.cas ?? {};
  const shifts: ShiftState[] = [];
  for (const ref of graph.getStateRefsAt(nodeId)) {
    if (ref.type !== SHIFT_TYPE) continue;
    const data = cas[ref.hash];
    if (data == null) continue;
    shifts.push(data as ShiftState);
  }
  return shifts;
};

/**
 * 「タブ（アンカー）」時点ではなく「タブ系譜の最新 leaf」時点の shifts を返す。
 *
 * Git ブランチ風モデルにおける比較対象の解決:
 * 比較で「A」を選んだ時、ユーザーが見たいのは「A の最新作業状態」であって
 * 「A 命名時点のスナップショット」ではない。
 */
export const selectShiftsAtTab = (
  state: RootState,
  planId: string,
  anchorNodeId: string | null
): ShiftState[] => {
  if (!anchorNodeId) return [];
  const graph = selectShiftPlanGraph(state, planId);
  if (!graph.state.nodes[anchorNodeId]) return [];
  const leafId = graph.getLatestDescendantLeaf(anchorNodeId);
  return selectShiftsAtNode(state, planId, leafId);
};

// ========== Thunks ==========

/**
 * 現在 apex にタブ名を付ける（既存ラベルを上書きする）。
 * apex が無い（まだ何も操作していない）場合は何もしない。
 */
export const nameCurrentTab =
  (planId: string, label: string) =>
  (dispatch: Dispatch, getState: GetState): void => {
    const state = getState() as RootState;
    const graph = selectShiftPlanGraph(state, planId);
    const apexId = graph.state.apexNodeId;
    if (!apexId) return;
    const trimmed = label.trim();
    const updated = graph.setNodeLabel(apexId, trimmed.length > 0 ? trimmed : undefined);
    dispatch(
      setGraph({ scopeId: shiftPlanScopeId(planId), graph: updated.toJSON() })
    );
  };

/**
 * 「グラフ上のあるノード時点」での shifts 完全リストを構築する内部ヘルパー。
 * - CAS にあるシフト → CAS 版で置換
 * - CAS に無いシフト → 現状を保ちつつ blockList を空にリセット
 *   （= ノード作成時には未編集だった = blockList は空）
 *
 * 部分マージにすると「対象に無い shift の placement が現状側に残る」ため、
 * 後続の差分ビューで誤検知が発生する。フルリプレースで状態を厳密に再現する。
 */
const buildRestoredShifts = (
  graph: WorldLineGraph,
  nodeId: string,
  state: RootState,
  planId: string
): ShiftState[] | null => {
  const plan = state.shiftPlan?.shiftPlans?.find((p) => p.id === planId);
  if (!plan?.shifts) return null;

  const refs = graph.getStateRefsAt(nodeId);
  const cas = state.worldLineGraph?.cas ?? {};
  const casMap = new Map<string, ShiftState>();
  for (const ref of refs) {
    if (ref.type !== SHIFT_TYPE) continue;
    const data = cas[ref.hash];
    if (data == null) continue;
    const s = data as ShiftState;
    casMap.set(s.id, s);
  }

  const tsTotalBlocks = new Map<string, number>();
  for (const ts of plan.timeSchedules ?? []) {
    tsTotalBlocks.set(ts.id, new TimeSchedule(ts).totalBlocks);
  }

  return plan.shifts.map((s) => {
    const fromCas = casMap.get(s.id);
    if (fromCas) return fromCas;
    const totalBlocks = s.timeScheduleId
      ? tsTotalBlocks.get(s.timeScheduleId) ?? 0
      : 0;
    return {
      ...s,
      blockList: {
        blocks: Array.from({ length: totalBlocks }, () => [] as string[]),
      },
    };
  });
};

/**
 * 共通: apex 移動とフル復元を 1 つの thunk フローに収める。
 * 移動先 nodeId（なし＝何もしない）と移動済み graph を受け取り、
 * setGraph + restoreShiftPlanFromWorldLine を順に dispatch する。
 */
const applyApexMove = (
  dispatch: Dispatch,
  state: RootState,
  planId: string,
  movedGraph: WorldLineGraph,
  targetNodeId: string | null
): void => {
  dispatch(
    setGraph({ scopeId: shiftPlanScopeId(planId), graph: movedGraph.toJSON() })
  );
  if (!targetNodeId) return;
  const restored = buildRestoredShifts(movedGraph, targetNodeId, state, planId);
  if (!restored) return;
  dispatch(restoreShiftPlanFromWorldLine({ planId, shifts: restored }));
};

/**
 * タブ（アンカー）クリック時の遷移。
 *
 * Git ブランチ風モデル: アンカー自身ではなく、アンカーから派生した最新 leaf へ移動する。
 * これにより「A タブをクリックすれば A 系譜の最新作業状態に戻れる」挙動になる。
 */
export const switchToTab =
  (planId: string, anchorNodeId: string) =>
  (dispatch: Dispatch, getState: GetState): void => {
    const state = getState() as RootState;
    const graph = selectShiftPlanGraph(state, planId);
    if (!graph.state.nodes[anchorNodeId]) return;
    const leafId = graph.getLatestDescendantLeaf(anchorNodeId);
    const moved = graph.moveTo(leafId);
    applyApexMove(dispatch, state, planId, moved, leafId);
  };

/**
 * タブのアンカー自身（命名時点のスナップショット）に移動する。Shift+クリック等の補助操作で使う。
 */
export const switchToTabAnchor =
  (planId: string, anchorNodeId: string) =>
  (dispatch: Dispatch, getState: GetState): void => {
    const state = getState() as RootState;
    const graph = selectShiftPlanGraph(state, planId);
    if (!graph.state.nodes[anchorNodeId]) return;
    const moved = graph.moveTo(anchorNodeId);
    applyApexMove(dispatch, state, planId, moved, anchorNodeId);
  };

/**
 * タブのラベルを除去する（ノード自体は履歴に残る）。
 */
export const removeTabLabel =
  (planId: string, anchorNodeId: string) =>
  (dispatch: Dispatch, getState: GetState): void => {
    const state = getState() as RootState;
    const graph = selectShiftPlanGraph(state, planId);
    if (!graph.state.nodes[anchorNodeId]) return;
    const updated = graph.setNodeLabel(anchorNodeId, undefined);
    dispatch(
      setGraph({ scopeId: shiftPlanScopeId(planId), graph: updated.toJSON() })
    );
  };

/**
 * 1 ステップ前のノード（apex の親）に戻る。Ctrl+Z 用。
 * apex が無いか、root にいる場合は何もしない。
 */
export const moveBackInPlan =
  (planId: string) =>
  (dispatch: Dispatch, getState: GetState): void => {
    const state = getState() as RootState;
    const graph = selectShiftPlanGraph(state, planId);
    if (!graph.canUndo) return;
    const moved = graph.moveBack();
    applyApexMove(dispatch, state, planId, moved, moved.state.apexNodeId);
  };

/**
 * 1 ステップ先のノード（同 worldLine 子優先）に進む。Ctrl+Shift+Z 用。
 * 子が無い場合は何もしない。
 */
export const moveForwardInPlan =
  (planId: string) =>
  (dispatch: Dispatch, getState: GetState): void => {
    const state = getState() as RootState;
    const graph = selectShiftPlanGraph(state, planId);
    if (!graph.canRedo) return;
    const moved = graph.moveForward();
    applyApexMove(dispatch, state, planId, moved, moved.state.apexNodeId);
  };
