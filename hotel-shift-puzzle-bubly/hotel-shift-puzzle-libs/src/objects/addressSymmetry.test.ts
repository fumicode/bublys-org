/**
 * 「オブジェクトの住所は1つ。読み・保存・削除が同じ解決式を共有する」を守る見張り。
 *
 * この規則が破れると、**静かにデータが失われる／勝手に復活する**。画面には何も出ない。
 * どちらも実際に踏んだので、再発したらここで落ちるようにしておく。
 */
import {
  computeStateHash,
  worldLineGraphSlice,
} from "@bublys-org/world-line-graph";
import { MonthlyStaffSchedule, Staff } from "@bublys-org/hotel-shift-puzzle-model";
import { registerObjects } from "./framework.js";
import { HOTEL_OBJECTS, SCHEDULE_TYPE, STAFF_TYPE } from "./hotelObjects.js";
import { APP_SCOPE_ID, localScopeId, removeObject, saveObject } from "./commit.js";
import { migrateLegacyScopes } from "./migrateLegacyScopes.js";
import { createSchedule } from "../feature/createSchedule.js";
import { recordSetCell } from "../feature/recordScheduleEdit.js";

registerObjects(HOTEL_OBJECTS);

const TOMB = computeStateHash(null);

type State = { worldLineGraph: ReturnType<typeof worldLineGraphSlice.getInitialState> };

function fakeStore() {
  let state: State = { worldLineGraph: worldLineGraphSlice.getInitialState() };
  return {
    getState: () => state,
    dispatch: (action: unknown) => {
      state = {
        worldLineGraph: worldLineGraphSlice.reducer(
          state.worldLineGraph,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          action as any
        ),
      };
    },
    nodeCount: (scopeId: string) =>
      Object.keys(state.worldLineGraph.graphs[scopeId]?.nodes ?? {}).length,
    /** そのスコープでその型に最後に付いた参照 */
    lastRefOf: (scopeId: string, type: string) =>
      Object.values(state.worldLineGraph.graphs[scopeId]?.nodes ?? {})
        .flatMap((n) => n.changedRefs)
        .filter((r) => r.type === type)
        .at(-1),
  };
}

describe("削除は保存と同じ住所へ届く", () => {
  it("★ 削除した勤務表は、その勤務表自身の世界線にも墓標が立つ", () => {
    const store = fakeStore();
    saveObject(store, STAFF_TYPE, new Staff({ id: "s1", name: "a" }));
    const schedule = createSchedule(store, { storeId: "st", year: 2026, month: 6 });
    const scopeId = localScopeId(SCHEDULE_TYPE, schedule.state.id);

    removeObject(store, SCHEDULE_TYPE, schedule.state.id);

    // 台帳にだけ墓標を置くと、消したはずの勤務表がその世界では生き続け、
    // そこで1回編集すると台帳へ書き戻されて復活する
    expect(store.lastRefOf(scopeId, SCHEDULE_TYPE)?.hash).toBe(TOMB);
    expect(store.lastRefOf(APP_SCOPE_ID, SCHEDULE_TYPE)?.hash).toBe(TOMB);
  });

  it("固定メンバーの削除は台帳だけを動かす（焼き付けた世界には届かない＝固定の意味）", () => {
    const store = fakeStore();
    saveObject(store, STAFF_TYPE, new Staff({ id: "s1", name: "a" }));
    const schedule = createSchedule(store, { storeId: "st", year: 2026, month: 6 });
    const scopeId = localScopeId(SCHEDULE_TYPE, schedule.state.id);
    const before = store.nodeCount(scopeId);

    removeObject(store, STAFF_TYPE, "s1");

    expect(store.lastRefOf(APP_SCOPE_ID, STAFF_TYPE)?.hash).toBe(TOMB);
    expect(store.lastRefOf(scopeId, STAFF_TYPE)?.hash).not.toBe(TOMB);
    expect(store.nodeCount(scopeId)).toBe(before); // 勤務表の世界は1ノードも動かない
  });
});

describe("古い形式の作り直しは、正しく生まれた世界を巻き込まない", () => {
  it("★ 名簿が空のときに作った勤務表の履歴を、あとから人を足しても消さない", () => {
    const store = fakeStore();
    // 名簿が空のまま勤務表を作る＝固定メンバー0件で**正しく**生まれた世界
    const schedule = createSchedule(store, { storeId: "st", year: 2026, month: 6 });
    const scopeId = localScopeId(SCHEDULE_TYPE, schedule.state.id);

    let cur: MonthlyStaffSchedule = schedule;
    for (let k = 0; k < 3; k++) {
      cur = recordSetCell(store, {
        schedule: cur,
        constraints: [],
        staffId: "s1",
        staffName: "x",
        day: schedule.workingDays()[k],
        to: { kind: "day-off" },
      });
    }
    const grown = store.nodeCount(scopeId);
    expect(grown).toBeGreaterThan(1);

    // あとから人を足す。「固定メンバーが0件」だけを見ると旧形式に見えるが、
    // この世界が生まれた時点では焼き付ける相手が居なかった
    saveObject(store, STAFF_TYPE, new Staff({ id: "s1", name: "あとから入った人" }));

    expect(migrateLegacyScopes(store)).toEqual([]);
    expect(store.nodeCount(scopeId)).toBe(grown);
  });
});
