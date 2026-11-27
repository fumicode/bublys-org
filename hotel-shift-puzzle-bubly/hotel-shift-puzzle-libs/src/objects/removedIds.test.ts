/**
 * 「記録が無い」を、一度も記録していない／削除した、に分けられることの見張り。
 * 店舗はこれで、昔の "store-1"（ID のまま）と削除した店舗（「（削除された店舗）」）を見分ける。
 */
import { worldLineGraphSlice } from "@bublys-org/world-line-graph";
import { HOTEL_FORMAT, Store, WorkingDay } from "@bublys-org/hotel-shift-puzzle-model";
import { registerObjects } from "./framework.js";
import { HOTEL_OBJECTS, STORE_TYPE } from "./hotelObjects.js";
import { APP_SCOPE_ID, removeObject, removedIdsOfTypeInScope, saveObject } from "./commit.js";

registerObjects(HOTEL_OBJECTS);

type State = { worldLineGraph: ReturnType<typeof worldLineGraphSlice.getInitialState> };

function fakeStore() {
  let state: State = { worldLineGraph: worldLineGraphSlice.getInitialState() };
  return {
    getState: () => state,
    dispatch: (action: unknown) => {
      state = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        worldLineGraph: worldLineGraphSlice.reducer(state.worldLineGraph, action as any),
      };
    },
  };
}

const store = (id: string) =>
  Store.create({ id, name: id, format: HOTEL_FORMAT, today: WorkingDay.of(2026, 11, 11) });

describe("removedIdsOfTypeInScope（削除した ID）", () => {
  it("削除した店舗だけが出る。一度も記録していない店舗・まだある店舗は出ない", () => {
    const s = fakeStore();
    saveObject(s, STORE_TYPE, store("kept"));
    saveObject(s, STORE_TYPE, store("gone"));
    removeObject(s, STORE_TYPE, "gone");

    expect(removedIdsOfTypeInScope(s, APP_SCOPE_ID, STORE_TYPE)).toEqual(["gone"]);
  });

  it("同じ ID で作り直せば、削除した ID からは外れる", () => {
    const s = fakeStore();
    saveObject(s, STORE_TYPE, store("again"));
    removeObject(s, STORE_TYPE, "again");
    saveObject(s, STORE_TYPE, store("again"));

    expect(removedIdsOfTypeInScope(s, APP_SCOPE_ID, STORE_TYPE)).toEqual([]);
  });
});
