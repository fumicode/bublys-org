/**
 * 旅程の**入れ物**（リポジトリ）。集約を保存して取り出すだけを持つ。
 *
 * ★ 予定を足す・外すのロジックは集約（`Itinerary_旅程`）にある。ここは
 *   `update` で丸ごと置くだけ（CLAUDE.md 規則 6）。
 */
import { createSelector, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction, WithSlice } from "@reduxjs/toolkit";
import { injectSlice, type RootState } from "@bublys-org/state-management";
import { Itinerary_旅程, type ItineraryPlain } from "../domain/Itinerary.domain.js";

export type ItineraryState = {
  itineraryList: ItineraryPlain[];
  /** いま見ている日（旅程 ID → 日付）。旅程そのものの中身ではないので集約に入れない */
  selectedDate: Record<string, string>;
};

const initialState: ItineraryState = { itineraryList: [], selectedDate: {} };

export const itinerarySlice = createSlice({
  name: "itinerary",
  initialState,
  reducers: {
    setItineraryList: (state, action: PayloadAction<ItineraryPlain[]>) => {
      state.itineraryList = action.payload;
    },
    addItinerary: (state, action: PayloadAction<ItineraryPlain>) => {
      state.itineraryList.push(action.payload);
    },
    /** 集約を丸ごと置く（保存だけ） */
    updateItinerary: (state, action: PayloadAction<ItineraryPlain>) => {
      const i = state.itineraryList.findIndex((t) => t.id === action.payload.id);
      if (i !== -1) state.itineraryList[i] = action.payload;
    },
    removeItinerary: (state, action: PayloadAction<string>) => {
      state.itineraryList = state.itineraryList.filter((t) => t.id !== action.payload);
      delete state.selectedDate[action.payload];
    },
    selectDate: (state, action: PayloadAction<{ itineraryId: string; date: string }>) => {
      state.selectedDate[action.payload.itineraryId] = action.payload.date;
    },
  },
});

declare module "@bublys-org/state-management" {
  export interface LazyLoadedSlices extends WithSlice<typeof itinerarySlice> {}
}

injectSlice(itinerarySlice);

type StateWithItinerary = RootState & { itinerary: ItineraryState };

export const {
  setItineraryList,
  addItinerary,
  updateItinerary,
  removeItinerary,
  selectDate,
} = itinerarySlice.actions;

const selectItineraryListRaw = (state: StateWithItinerary): ItineraryPlain[] =>
  state.itinerary?.itineraryList ?? [];

export const selectItineraries = createSelector(
  [selectItineraryListRaw],
  (list): Itinerary_旅程[] => list.map(Itinerary_旅程.fromPlain),
);

export const selectItineraryById = (id: string) =>
  createSelector([selectItineraryListRaw], (list): Itinerary_旅程 | undefined => {
    const plain = list.find((t) => t.id === id);
    return plain ? Itinerary_旅程.fromPlain(plain) : undefined;
  });

/** いま見ている日。決まっていなければその旅程の最初の日 */
export const selectSelectedDate = (itineraryId: string) =>
  createSelector(
    [
      (state: StateWithItinerary) => state.itinerary?.selectedDate?.[itineraryId],
      selectItineraryById(itineraryId),
    ],
    (chosen, itinerary): string | undefined => {
      if (chosen && itinerary?.dates.includes(chosen)) return chosen;
      return itinerary?.dates[0];
    },
  );

export { Itinerary_旅程 };
export type { ItineraryPlain };
