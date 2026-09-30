/**
 * 宿の**入れ物**（リポジトリ）。保存して取り出すだけを持つ。
 *
 * ★ 集約に属するロジック（名前を直す・居場所を言う）は {@link Lodging_宿} の仕事。
 *   ここは受け取ったものを置くだけにする（CLAUDE.md 規則6）。
 */
import { createSlice, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction, WithSlice } from "@reduxjs/toolkit";
import { injectSlice, type RootState } from "@bublys-org/state-management";
import { Lodging_宿, type LodgingPlain } from "../domain/Lodging.domain.js";

export type LodgingState = {
  lodgingList: LodgingPlain[];
  /**
   * **もう撒いた調べ物の名前。**
   *
   * ★ 「0 件なら撒く」だけでは、あとから増えた調べ物がすでに使っている人に届かない。
   *   かといって「無ければ足す」にすると、**人が消した宿が次に開いたとき戻ってくる**。
   *   撒いたことを覚えておけば、どちらにもならない。
   */
  seeded: string[];
};

const initialState: LodgingState = { lodgingList: [], seeded: [] };

export const lodgingSlice = createSlice({
  name: "lodging",
  initialState,
  reducers: {
    setLodgingList: (state, action: PayloadAction<LodgingPlain[]>) => {
      state.lodgingList = action.payload;
    },
    /** 調べ物をひと組、足す（まだ撒いていなければ） */
    seedLodgings: (state, action: PayloadAction<{ name: string; lodgings: LodgingPlain[] }>) => {
      if (!state.seeded) state.seeded = [];
      if (state.seeded.includes(action.payload.name)) return;
      const have = new Set(state.lodgingList.map((l) => l.id));
      for (const x of action.payload.lodgings) if (!have.has(x.id)) state.lodgingList.push(x);
      state.seeded.push(action.payload.name);
    },
    addLodging: (state, action: PayloadAction<LodgingPlain>) => {
      state.lodgingList.push(action.payload);
    },
    /** 集約を丸ごと置く（保存だけ） */
    updateLodging: (state, action: PayloadAction<LodgingPlain>) => {
      const i = state.lodgingList.findIndex((l) => l.id === action.payload.id);
      if (i !== -1) state.lodgingList[i] = action.payload;
    },
    removeLodging: (state, action: PayloadAction<string>) => {
      state.lodgingList = state.lodgingList.filter((l) => l.id !== action.payload);
    },
  },
});

declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof lodgingSlice> {}
}

injectSlice(lodgingSlice);

type StateWithLodging = RootState & { lodging: LodgingState };

export const {
  setLodgingList,
  seedLodgings,
  addLodging,
  updateLodging,
  removeLodging,
} = lodgingSlice.actions;

const selectListRaw = (state: StateWithLodging): LodgingPlain[] => state.lodging?.lodgingList ?? [];

/** 保存形のまま ── 1,500 件を集約に直すのは、絞ったあとでよい */
export const selectLodgingPlains = selectListRaw;

export const selectLodgings = createSelector(
  [selectListRaw],
  (list): Lodging_宿[] => list.map(Lodging_宿.fromPlain),
);

export const selectLodgingById = (id: string) =>
  createSelector([selectListRaw], (list): Lodging_宿 | undefined => {
    const found = list.find((l) => l.id === id);
    return found ? Lodging_宿.fromPlain(found) : undefined;
  });
