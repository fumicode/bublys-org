/**
 * 地図の**入れ物**（リポジトリ）。地点を保存して取り出すのと、
 * 「いま映している範囲」「探す範囲として決めた範囲」を覚えるだけを持つ。
 *
 * ★ 範囲の計算（寄る・動かす・中に入っているか）は集約（{@link MapBounds_範囲}）の仕事。
 *   ここは受け取った範囲を置くだけにする（CLAUDE.md 規則6）。
 */
import { createSlice, createSelector } from "@reduxjs/toolkit";
import type { PayloadAction, WithSlice } from "@reduxjs/toolkit";
import { injectSlice, type RootState } from "@bublys-org/state-management";
import type { ObjectRef } from "@bublys-org/bubbles-ui";
import { Spot_地点, type SpotPlain } from "../domain/Spot.domain.js";
import { ECHIGO_TSUMARI_BOUNDS, MapBounds_範囲, type MapBoundsPlain } from "../domain/MapBounds.domain.js";

export type MapState = {
  spotList: SpotPlain[];
  /** いま映している範囲 */
  bounds: MapBoundsPlain;
  /**
   * **探す範囲**。地図で「この範囲で探す」を押したときだけ入る。
   *
   * ★ 映している範囲とは別に持つ。同じにすると、地図を少し動かしただけで
   *   アクティビティの一覧が勝手に入れ替わる ── 探すのは人が決めたときだけにする。
   */
  searchBounds: MapBoundsPlain | null;
  /**
   * **渡されたもの**（型と id の並び、渡された順）。
   *
   * > 地図は、場所を名乗っているものなら何でも描く。
   *
   * ★ 前は `routeSpotIds: string[]` で、しかも**旅程がここへ書き込んでいた**。
   *   地図の引き出しを他人が開けていたので、地図は「渡されたもの」ではなく
   *   「誰かが置いていったもの」を描いていた。いまは**落とされたときだけ**ここに入る。
   * ★ 中身は指（型と id）だけ。何であるかは、描くときに持ち主へ訊く
   *   ── だから地図は旅程もアクティビティも import しない。
   */
  handed: ObjectRef[];
  /**
   * **もう撒いた調べ物の名前。**
   *
   * ★ 「地点が 0 件なら撒く」だけでは、あとから増えた調べ物（越後の 793 件）が
   *   すでに使っている人に永久に届かない。かといって「無ければ足す」にすると、
   *   **人が消した地点が次に開いたとき戻ってくる**。撒いたことを覚えておけば、
   *   どちらにもならない ── 撒くのは 1 度きり、消したものは消えたまま。
   */
  seeded: string[];
};

const initialState: MapState = {
  spotList: [],
  bounds: ECHIGO_TSUMARI_BOUNDS,
  searchBounds: null,
  handed: [],
  seeded: [],
};

export const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    setSpotList: (state, action: PayloadAction<SpotPlain[]>) => {
      state.spotList = action.payload;
    },
    addSpot: (state, action: PayloadAction<SpotPlain>) => {
      state.spotList.push(action.payload);
    },
    /** 集約を丸ごと置く（保存だけ） */
    updateSpot: (state, action: PayloadAction<SpotPlain>) => {
      const index = state.spotList.findIndex((s) => s.id === action.payload.id);
      if (index !== -1) state.spotList[index] = action.payload;
    },
    removeSpot: (state, action: PayloadAction<string>) => {
      state.spotList = state.spotList.filter((s) => s.id !== action.payload);
    },
    /**
     * 調べ物をひと組、足す（まだ撒いていなければ）。
     *
     * ★ 保存されたものは**前の形のまま戻ってくる**ことがあるので、無ければ作る。
     */
    seedSpots: (state, action: PayloadAction<{ name: string; spots: SpotPlain[] }>) => {
      if (!state.seeded) state.seeded = [];
      if (state.seeded.includes(action.payload.name)) return;
      const have = new Set(state.spotList.map((s) => s.id));
      for (const spot of action.payload.spots) if (!have.has(spot.id)) state.spotList.push(spot);
      state.seeded.push(action.payload.name);
    },
    /** いま映している範囲を置く（計算は済んでいる） */
    setBounds: (state, action: PayloadAction<MapBoundsPlain>) => {
      state.bounds = action.payload;
    },
    /** 探す範囲を決める／やめる */
    setSearchBounds: (state, action: PayloadAction<MapBoundsPlain | null>) => {
      state.searchBounds = action.payload;
    },
    /**
     * 渡されたものを置く。
     *
     * ★ **同じものを渡し直したら、全部入れ替える。** 足し続けると、
     *   旅程の日を渡すたびに前の日の道が残って、どれがいまの道か言えなくなる。
     *   「いま渡されているもの」は 1 組だけ、という決まりにする。
     */
    setHanded: (state, action: PayloadAction<ObjectRef[]>) => {
      state.handed = action.payload;
    },
    /** 渡されたものを返す（空にする） */
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
  setSpotList,
  seedSpots,
  addSpot,
  updateSpot,
  removeSpot,
  setBounds,
  setSearchBounds,
  setHanded,
  clearHanded,
} = mapSlice.actions;

const selectSpotListRaw = (state: StateWithMap): SpotPlain[] => state.map?.spotList ?? [];
const selectBoundsRaw = (state: StateWithMap): MapBoundsPlain => state.map?.bounds ?? ECHIGO_TSUMARI_BOUNDS;
const selectSearchBoundsRaw = (state: StateWithMap): MapBoundsPlain | null =>
  state.map?.searchBounds ?? null;
const EMPTY_HANDED: ObjectRef[] = [];

/** 地点の一覧（ドメインオブジェクト） */
export const selectSpots = createSelector(
  [selectSpotListRaw],
  (list): Spot_地点[] => list.map(Spot_地点.fromPlain),
);

/** ID で地点を引く */
export const selectSpotById = (id: string) =>
  createSelector(
    [selectSpotListRaw],
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

/**
 * **探す範囲**。ほかのバブリ（アクティビティ）はここだけを読めばよい。
 * 決めていなければ `undefined` ＝ 絞らない。
 */
export const selectSearchBounds = createSelector(
  [selectSearchBoundsRaw],
  (plain): MapBounds_範囲 | undefined => (plain ? MapBounds_範囲.fromPlain(plain) : undefined),
);

/** いま渡されているもの（渡された順） */
export const selectHanded = (state: StateWithMap): ObjectRef[] =>
  state.map?.handed ?? EMPTY_HANDED;

export { Spot_地点, MapBounds_範囲 };
export type { SpotPlain, MapBoundsPlain };
