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
import { Spot_地点, type SpotPlain } from "../domain/Spot.domain.js";
import { HAKONE_BOUNDS, MapBounds_範囲, type MapBoundsPlain } from "../domain/MapBounds.domain.js";

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
   * **いま示されている道**（地点 ID の並び）。地図はこれを繋いで点線を引く。
   *
   * ★ **地図は道の意味を知らない。** 渡された並びを繋ぐだけ ── 旅程がその日の
   *   行き先を渡すので結果として旅程の道になるが、地図から旅程を引きに行かない。
   *   引きに行くと、地図が旅程に依存して一方通行が崩れる。
   */
  routeSpotIds: string[];
};

const initialState: MapState = {
  spotList: [],
  bounds: HAKONE_BOUNDS,
  searchBounds: null,
  routeSpotIds: [],
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
    /** いま映している範囲を置く（計算は済んでいる） */
    setBounds: (state, action: PayloadAction<MapBoundsPlain>) => {
      state.bounds = action.payload;
    },
    /** 探す範囲を決める／やめる */
    setSearchBounds: (state, action: PayloadAction<MapBoundsPlain | null>) => {
      state.searchBounds = action.payload;
    },
    /** 道として繋ぐ地点の並びを置く（空なら道は消える） */
    setRoute: (state, action: PayloadAction<string[]>) => {
      state.routeSpotIds = action.payload;
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
  addSpot,
  updateSpot,
  removeSpot,
  setBounds,
  setSearchBounds,
  setRoute,
} = mapSlice.actions;

const selectSpotListRaw = (state: StateWithMap): SpotPlain[] => state.map?.spotList ?? [];
const selectBoundsRaw = (state: StateWithMap): MapBoundsPlain => state.map?.bounds ?? HAKONE_BOUNDS;
const selectSearchBoundsRaw = (state: StateWithMap): MapBoundsPlain | null =>
  state.map?.searchBounds ?? null;
const EMPTY_ROUTE: string[] = [];

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

/** 道として繋ぐ地点の並び */
export const selectRouteSpotIds = (state: StateWithMap): string[] =>
  state.map?.routeSpotIds ?? EMPTY_ROUTE;

export { Spot_地点, MapBounds_範囲 };
export type { SpotPlain, MapBoundsPlain };
