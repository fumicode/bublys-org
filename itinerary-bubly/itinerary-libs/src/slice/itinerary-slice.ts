/**
 * 旅程の**入れ物**（リポジトリ）。集約を保存して取り出すだけを持つ。
 *
 * ★ 予定を足す・外すのロジックは集約（`Itinerary_旅程`）にある。ここは
 *   `update` で丸ごと置くだけ（CLAUDE.md 規則 6）。
 */
import { createSelector, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction, WithSlice } from "@reduxjs/toolkit";
import { injectSlice, type RootState } from "@bublys-org/state-management";
import type { ObjectRef } from "@bublys-org/bubbles-ui";
import { Itinerary_旅程, type ItineraryPlain } from "../domain/Itinerary.domain.js";
import type { ItineraryItem_予定 } from "../domain/ItineraryItem.domain.js";

export type ItineraryState = {
  itineraryList: ItineraryPlain[];
  /** いま見ている日（旅程 ID → 日付）。旅程そのものの中身ではないので集約に入れない */
  selectedDate: Record<string, string>;
  /**
   * **渡されたもの**（旅程 ID → 指の並び）。メモを渡すと、ここに残る。
   *
   * ★ 本計画づくりの場は、これを広げて「まだ入っていないもの」を浮かべる。
   *   渡されたことを覚えていないと、**作業場を開き直したときに空になる**。
   * ★ 旅程そのものの中身ではない（旅程は予定の集まり）ので、集約には入れない。
   */
  handed: Record<string, ObjectRef[]>;
};

const initialState: ItineraryState = { itineraryList: [], selectedDate: {}, handed: {} };

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
    /**
     * 渡されたものを覚える（同じものを渡し直したら足さない）。
     *
     * ★ **無ければ作る。** このスライスは保存されるので、項目を足したあとも
     *   **前の形のまま戻ってくる**ことがある（`handed` がまだ無い保存）。
     *   初期値に書いただけでは足りない ── 読み戻しは初期値の上に古い形を重ねる。
     */
    rememberHanded: (state, action: PayloadAction<{ itineraryId: string; ref: ObjectRef }>) => {
      if (!state.handed) state.handed = {};
      const { itineraryId, ref } = action.payload;
      const list = state.handed[itineraryId] ?? [];
      if (list.some((r) => r.type === ref.type && r.id === ref.id)) return;
      state.handed[itineraryId] = [...list, ref];
    },
    /** 渡されたものを返す */
    forgetHanded: (state, action: PayloadAction<string>) => {
      if (!state.handed) return;
      delete state.handed[action.payload];
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
  rememberHanded,
  forgetHanded,
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

/**
 * **予定 1 件を、id だけで引く。**
 *
 * ★ 予定は泡になった（札と詳細）ので、**旅程を知らないまま**引けないといけない
 *   ── 泡が持っているのは url だけで、そこに旅程の id は入っていない。
 *   id は作るときに重ならないようにしてあるので、これで足りる。
 */
export const selectItineraryItem = (itemId: string) =>
  createSelector(
    [selectItineraryListRaw],
    (list): { itinerary: Itinerary_旅程; item: ItineraryItem_予定 } | undefined => {
      for (const plain of list) {
        const found = plain.days.flatMap((d) => d.items).find((i) => i.id === itemId);
        if (!found) continue;
        const itinerary = Itinerary_旅程.fromPlain(plain);
        const item = itinerary.findItem(itemId);
        if (item) return { itinerary, item };
      }
      return undefined;
    },
  );

const EMPTY_HANDED: ObjectRef[] = [];

/** その旅程に渡されているもの */
export const selectHanded = (itineraryId: string) =>
  (state: StateWithItinerary): ObjectRef[] =>
    state.itinerary?.handed?.[itineraryId] ?? EMPTY_HANDED;

export { Itinerary_旅程 };
export type { ItineraryPlain };
