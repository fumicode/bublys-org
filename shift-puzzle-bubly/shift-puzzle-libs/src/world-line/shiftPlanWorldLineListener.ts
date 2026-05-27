/**
 * shift-plan world-line listener
 *
 * shift-plan-slice の配置系アクションを傍受し、
 * 変更された Shift を CAS に記録して WorldLineGraph を grow する。
 *
 * スコープ単位: 1 ShiftPlan = 1 scope （`shift-plan:${planId}`）
 * 記録単位: Shift（id 単位、blockList を含む ShiftState をまるごと）
 */
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import type { RootState } from "@bublys-org/state-management";
import {
  computeStateHash,
  createStateRef,
  WorldLineGraph,
  setGraph,
  setCasEntries,
  type StateRef,
} from "@bublys-org/world-line-graph";
import type { ShiftState, ShiftPlanState } from "@bublys-org/shift-puzzle-model";
import {
  addUserToBlock,
  removeUserFromBlock,
  addUserToBlockRange,
  removeUserFromBlockRange,
  moveUserBlocks,
  updateShiftPlan,
  addShiftPlan,
} from "../slice/shift-plan-slice.js";

// ========== 定数 ==========

const SHIFT_TYPE = "Shift";

const scopeIdFor = (planId: string) => `shift-plan:${planId}`;

// ========== Helper ==========

const findPlan = (
  state: RootState,
  planId: string
): ShiftPlanState | undefined =>
  state.shiftPlan?.shiftPlans?.find((p) => p.id === planId);

const resolvePlanId = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const p = payload as { planId?: string; id?: string };
  return p.planId ?? p.id;
};

// ========== Middleware ==========

export const shiftPlanWorldLineListener = createListenerMiddleware();

shiftPlanWorldLineListener.startListening({
  matcher: isAnyOf(
    addUserToBlock,
    removeUserFromBlock,
    addUserToBlockRange,
    removeUserFromBlockRange,
    moveUserBlocks,
    updateShiftPlan,
    addShiftPlan
  ),
  effect: (action, listenerApi) => {
    const planId = resolvePlanId(action.payload);
    if (!planId) return;

    const prevState = listenerApi.getOriginalState() as RootState;
    const nextState = listenerApi.getState() as RootState;

    const prevShifts = findPlan(prevState, planId)?.shifts ?? [];
    const nextShifts = findPlan(nextState, planId)?.shifts ?? [];
    if (nextShifts.length === 0) return;

    // 旧 shift を hash で検索できるように Map に整形
    const prevHashMap = new Map<string, string>();
    for (const s of prevShifts) {
      prevHashMap.set(s.id, computeStateHash(s));
    }

    // 変更された Shift を抽出
    const changed: { shift: ShiftState; hash: string }[] = [];
    for (const s of nextShifts) {
      const hash = computeStateHash(s);
      if (prevHashMap.get(s.id) === hash) continue;
      changed.push({ shift: s, hash });
    }
    if (changed.length === 0) return;

    // grow
    const refs: StateRef[] = changed.map((c) =>
      createStateRef(SHIFT_TYPE, c.shift.id, c.hash)
    );
    const entries = changed.map((c) => ({ hash: c.hash, data: c.shift }));

    const scopeId = scopeIdFor(planId);
    const graphJson = nextState.worldLineGraph?.graphs[scopeId];
    const graph = graphJson
      ? WorldLineGraph.fromJSON(graphJson)
      : WorldLineGraph.empty();
    const updated = graph.grow(refs);

    listenerApi.dispatch(setGraph({ scopeId, graph: updated.toJSON() }));
    listenerApi.dispatch(setCasEntries({ entries }));
  },
});
