/**
 * 宿の**入れ物**（リポジトリ）。
 *
 * > **調べ物は持ち物ではない。入れ物が覚えるのは、人が触ったぶんだけ。**
 *
 * ★ 越後の 1,516 軒は `tools/echigo` が作った**読むだけのもの**。前はこれを丸ごと
 *   `lodgingList` に入れていて、保存する所（localStorage）へ毎回 1,516 軒ぶんの字を
 *   書き直していた ── 操作のたびに数百 KB を書くので、全体が重かった。
 *   いまは調べ物をモジュールから直に読み、入れ物は**足した・直した・消した**の
 *   3 つだけを覚える。
 * ★ **消したものは戻ってこない**という決まりは、そのまま残す（`removedIds`）。
 * ★ 集約に属するロジック（名前を直す・居場所を言う）は {@link Lodging_宿} の仕事。
 *   ここは受け取ったものを置くだけにする（CLAUDE.md 規則6）。
 */
import { createSlice, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction, WithSlice } from "@reduxjs/toolkit";
import { injectSlice, type RootState } from "@bublys-org/state-management";
import { Lodging_宿, type LodgingPlain } from "../domain/Lodging.domain.js";
import { ECHIGO } from "../data/echigo-lodgings.js";

export type LodgingState = {
  /** 人が足した宿 */
  addedLodgings: LodgingPlain[];
  /** 人が直した宿（id が同じ調べ物を上書きする） */
  editedLodgings: LodgingPlain[];
  /** 人が消した id */
  removedLodgingIds: string[];
};

const initialState: LodgingState = {
  addedLodgings: [],
  editedLodgings: [],
  removedLodgingIds: [],
};

export const lodgingSlice = createSlice({
  name: "lodging",
  initialState,
  reducers: {
    addLodging: (state, action: PayloadAction<LodgingPlain>) => {
      state.addedLodgings.push(action.payload);
      state.removedLodgingIds = state.removedLodgingIds.filter((id) => id !== action.payload.id);
    },
    /**
     * 集約を丸ごと置く（保存だけ）。
     *
     * ★ 人が足したものなら、足したほうを直す。調べ物なら、上書きとして覚える。
     */
    updateLodging: (state, action: PayloadAction<LodgingPlain>) => {
      const added = state.addedLodgings.findIndex((l) => l.id === action.payload.id);
      if (added !== -1) {
        state.addedLodgings[added] = action.payload;
        return;
      }
      const edited = state.editedLodgings.findIndex((l) => l.id === action.payload.id);
      if (edited !== -1) state.editedLodgings[edited] = action.payload;
      else state.editedLodgings.push(action.payload);
    },
    removeLodging: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.addedLodgings = state.addedLodgings.filter((l) => l.id !== id);
      state.editedLodgings = state.editedLodgings.filter((l) => l.id !== id);
      if (!state.removedLodgingIds.includes(id)) state.removedLodgingIds.push(id);
    },
  },
});

declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof lodgingSlice> {}
}

injectSlice(lodgingSlice);

type StateWithLodging = RootState & { lodging: LodgingState };

export const { addLodging, updateLodging, removeLodging } = lodgingSlice.actions;

const EMPTY_LODGINGS: LodgingPlain[] = [];
const EMPTY_IDS: string[] = [];

const selectAddedRaw = (state: StateWithLodging): LodgingPlain[] =>
  state.lodging?.addedLodgings ?? EMPTY_LODGINGS;
const selectEditedRaw = (state: StateWithLodging): LodgingPlain[] =>
  state.lodging?.editedLodgings ?? EMPTY_LODGINGS;
const selectRemovedRaw = (state: StateWithLodging): string[] =>
  state.lodging?.removedLodgingIds ?? EMPTY_IDS;

/**
 * **いまの宿ぜんぶ**（保存形のまま ── 1,516 軒を集約に直すのは、絞ったあとでよい）。
 * 調べ物に、人が直したぶんを被せ、消したぶんを落とし、足したぶんを継ぎ足す。
 */
export const selectLodgingPlains = createSelector(
  [selectAddedRaw, selectEditedRaw, selectRemovedRaw],
  (added, edited, removed): LodgingPlain[] => {
    const gone = new Set(removed);
    const over = new Map(edited.map((l) => [l.id, l]));
    const out: LodgingPlain[] = [];
    for (const l of ECHIGO) {
      if (gone.has(l.id)) continue;
      out.push(over.get(l.id) ?? l);
    }
    for (const l of added) {
      if (gone.has(l.id)) continue;
      out.push(over.get(l.id) ?? l);
    }
    return out;
  },
);

/** ID で宿を引く（保存形のまま） */
export const selectLodgingPlainById = (
  state: StateWithLodging,
  id: string,
): LodgingPlain | undefined => selectLodgingPlains(state).find((l) => l.id === id);

export const selectLodgings = createSelector(
  [selectLodgingPlains],
  (list): Lodging_宿[] => list.map(Lodging_宿.fromPlain),
);

export const selectLodgingById = (id: string) =>
  createSelector([selectLodgingPlains], (list): Lodging_宿 | undefined => {
    const found = list.find((l) => l.id === id);
    return found ? Lodging_宿.fromPlain(found) : undefined;
  });
