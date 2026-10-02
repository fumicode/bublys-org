/**
 * 地図の**入れ物**（リポジトリ）。
 *
 * > **調べ物は持ち物ではない。入れ物が覚えるのは、人が触ったぶんだけ。**
 *
 * ★ 越後の 793 件は `tools/echigo` が作った**読むだけのもの**。前はこれを丸ごと
 *   `spotList` に入れていて、保存する所（localStorage）へ毎回 793 件ぶんの字を
 *   書き直していた ── 操作のたびに数百 KB を書くので、全体が重かった。
 *   いまは調べ物をモジュールから直に読み、入れ物は**足した・直した・消した**の
 *   3 つだけを覚える。保存されるのは人が触ったぶんだけなので、ふだんは空に近い。
 * ★ **消したものは戻ってこない**という決まりは、そのまま残す（`removedIds`）。
 *   前はこれを「撒いたことを覚えておく」で実現していたが、消した id を覚えるほうが
 *   直接的で、調べ物が増えても勝手に効く。
 * ★ 範囲の計算（寄る・動かす・中に入っているか）は集約（{@link MapBounds_範囲}）の仕事。
 *   ここは受け取った範囲を置くだけにする（CLAUDE.md 規則6）。
 */
import { createSlice, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction, WithSlice } from "@reduxjs/toolkit";
import { injectSlice, type RootState } from "@bublys-org/state-management";
import type { ObjectRef } from "@bublys-org/bubbles-ui";
import { Spot_地点, type SpotPlain } from "../domain/Spot.domain.js";
import { ECHIGO } from "../data/echigo-spots.js";
import { ECHIGO_TSUMARI_BOUNDS, MapBounds_範囲, type MapBoundsPlain } from "../domain/MapBounds.domain.js";

export type MapState = {
  /** 人が足した地点 */
  addedSpots: SpotPlain[];
  /** 人が直した地点（id が同じ調べ物を上書きする） */
  editedSpots: SpotPlain[];
  /** 人が消した id */
  removedSpotIds: string[];
  /** いま映している範囲 */
  bounds: MapBoundsPlain;
  /**
   * **渡されたもの**（型と id の並び、渡された順）。
   *
   * > 地図は、場所を名乗っているものなら何でも描く。
   *
   * ★ 中身は指（型と id）だけ。何であるかは、描くときに持ち主へ訊く
   *   ── だから地図は旅程もアクティビティも import しない。
   */
  handed: ObjectRef[];
};

const initialState: MapState = {
  addedSpots: [],
  editedSpots: [],
  removedSpotIds: [],
  bounds: ECHIGO_TSUMARI_BOUNDS,
  handed: [],
};

export const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    addSpot: (state, action: PayloadAction<SpotPlain>) => {
      state.addedSpots.push(action.payload);
      state.removedSpotIds = state.removedSpotIds.filter((id) => id !== action.payload.id);
    },
    /**
     * 集約を丸ごと置く（保存だけ）。
     *
     * ★ 人が足したものなら、足したほうを直す。調べ物なら、上書きとして覚える
     *   ── 調べ物そのものは読むだけなので、ここでは触らない。
     */
    updateSpot: (state, action: PayloadAction<SpotPlain>) => {
      const added = state.addedSpots.findIndex((s) => s.id === action.payload.id);
      if (added !== -1) {
        state.addedSpots[added] = action.payload;
        return;
      }
      const edited = state.editedSpots.findIndex((s) => s.id === action.payload.id);
      if (edited !== -1) state.editedSpots[edited] = action.payload;
      else state.editedSpots.push(action.payload);
    },
    removeSpot: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.addedSpots = state.addedSpots.filter((s) => s.id !== id);
      state.editedSpots = state.editedSpots.filter((s) => s.id !== id);
      if (!state.removedSpotIds.includes(id)) state.removedSpotIds.push(id);
    },
    /** いま映している範囲を置く（計算は済んでいる） */
    setBounds: (state, action: PayloadAction<MapBoundsPlain>) => {
      state.bounds = action.payload;
    },
    /**
     * **渡されたものを足す**（落としたときの既定）。
     *
     * > 落とすのは「これも見せて」であって、「これだけにして」ではない。
     *
     * ★ 前は落とすたびに入れ替えていた。そうすると**2 つ以上を一度に見られない**
     *   ── 旅程の日と宿の一覧を並べて見たいときに、後から落としたほうしか残らない。
     * ★ 入れ替えをやめても「どれがいまの道か分からない」にはならない。
     *   **道は渡したもの 1 つにつき 1 本**にしてあるので、足しても線が繋がらない。
     * ★ 同じものを 2 度落としても増やさない（同じピンが重なるだけなので）。
     * ★ 空にするのは「ピンを消す」から（`clearHanded`）。
     */
    addHanded: (state, action: PayloadAction<ObjectRef[]>) => {
      const have = new Set(state.handed.map((r) => `${r.type}/${r.id}`));
      for (const ref of action.payload) {
        const key = `${ref.type}/${ref.id}`;
        if (have.has(key)) continue;
        have.add(key);
        state.handed.push(ref);
      }
    },
    /** 渡されたものを丸ごと置き換える（足すのではなく入れ替えたいとき） */
    setHanded: (state, action: PayloadAction<ObjectRef[]>) => {
      state.handed = action.payload;
    },
    /** 渡されたものを 1 つだけ下ろす */
    removeHanded: (state, action: PayloadAction<ObjectRef>) => {
      state.handed = state.handed.filter(
        (r) => !(r.type === action.payload.type && r.id === action.payload.id),
      );
    },
    /** 渡されたものを空にする（地図のピンが消える） */
    clearHanded: (state) => {
      state.handed = [];
    },
  },
});

declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof mapSlice> {}
}

injectSlice(mapSlice);

type StateWithMap = RootState & { map: MapState };

export const {
  addHanded,
  removeHanded,
  addSpot,
  updateSpot,
  removeSpot,
  setBounds,
  setHanded,
  clearHanded,
} = mapSlice.actions;

const EMPTY_SPOTS: SpotPlain[] = [];
const EMPTY_IDS: string[] = [];
const EMPTY_HANDED: ObjectRef[] = [];

const selectAddedRaw = (state: StateWithMap): SpotPlain[] => state.map?.addedSpots ?? EMPTY_SPOTS;
const selectEditedRaw = (state: StateWithMap): SpotPlain[] => state.map?.editedSpots ?? EMPTY_SPOTS;
const selectRemovedRaw = (state: StateWithMap): string[] => state.map?.removedSpotIds ?? EMPTY_IDS;
const selectBoundsRaw = (state: StateWithMap): MapBoundsPlain => state.map?.bounds ?? ECHIGO_TSUMARI_BOUNDS;

/**
 * **いまの地点ぜんぶ**（保存形のまま）。
 * 調べ物に、人が直したぶんを被せ、消したぶんを落とし、足したぶんを継ぎ足す。
 */
export const selectSpotPlains = createSelector(
  [selectAddedRaw, selectEditedRaw, selectRemovedRaw],
  (added, edited, removed): SpotPlain[] => {
    const gone = new Set(removed);
    const over = new Map(edited.map((s) => [s.id, s]));
    const out: SpotPlain[] = [];
    for (const s of ECHIGO) {
      if (gone.has(s.id)) continue;
      out.push(over.get(s.id) ?? s);
    }
    for (const s of added) {
      if (gone.has(s.id)) continue;
      out.push(over.get(s.id) ?? s);
    }
    return out;
  },
);

/** 地点の一覧（ドメインオブジェクト） */
export const selectSpots = createSelector(
  [selectSpotPlains],
  (list): Spot_地点[] => list.map(Spot_地点.fromPlain),
);

/** ID で地点を引く（保存形のまま） */
export const selectSpotPlainById = (state: StateWithMap, id: string): SpotPlain | undefined =>
  selectSpotPlains(state).find((s) => s.id === id);

/** ID で地点を引く */
export const selectSpotById = (id: string) =>
  createSelector(
    [selectSpotPlains],
    (list): Spot_地点 | undefined => {
      const plain = list.find((s) => s.id === id);
      return plain ? Spot_地点.fromPlain(plain) : undefined;
    },
  );

/** いま映している範囲 */
export const selectBounds = createSelector(
  [selectBoundsRaw],
  (plain): MapBounds_範囲 => MapBounds_範囲.fromPlain(plain),
);


/** いま渡されているもの（渡された順） */
export const selectHanded = (state: StateWithMap): ObjectRef[] =>
  state.map?.handed ?? EMPTY_HANDED;

export { Spot_地点, MapBounds_範囲 };
export type { SpotPlain, MapBoundsPlain };
