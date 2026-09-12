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
import {
  GLOBAL_WORKSHIFT_SET_ID,
  HOTEL_OBJECTS,
  SCHEDULE_TYPE,
  STAFF_TYPE,
  WORKSHIFT_SET_TYPE,
} from "./hotelObjects.js";
import { homeScopeOf } from "./framework.js";
import { absentInReadScope, readScopeIdOf } from "./world.js";
import {
  APP_SCOPE_ID,
  isAbsentInScope,
  localScopeId,
  removeObject,
  saveObject,
} from "./commit.js";
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
    /**
     * メモリ上の CAS から**値だけ**落とす（参照はグラフに残る）。
     * 「読めない」と「無い」の違いを作るのはこれ。実機では300件を超えると起きる
     */
    evict: (hash: string) => {
      const cas = { ...state.worldLineGraph.cas };
      delete cas[hash];
      state = { worldLineGraph: { ...state.worldLineGraph, cas } };
    },
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

describe("読みと書きが同じ (type, id) で住所を解く", () => {
  const world = (born: boolean, scopeId: string) =>
    ({ scopeId, born, here: null, app: null }) as unknown as Parameters<
      typeof readScopeIdOf
    >[0];

  it("★ グローバル固定IDの型は、世界の中から読んでも台帳を見る", () => {
    const sched = localScopeId(SCHEDULE_TYPE, "sc1");
    // 勤務帯セットは id で本籍が変わる。id を渡さないと世界の中を探して「無い」になる
    expect(readScopeIdOf(world(true, sched), WORKSHIFT_SET_TYPE, "sc1")).toBe(sched);
    expect(
      readScopeIdOf(world(true, sched), WORKSHIFT_SET_TYPE, GLOBAL_WORKSHIFT_SET_ID)
    ).toBe(APP_SCOPE_ID);
  });

  it("自分の世界のものは、読みと書きの住所が一致する", () => {
    const sched = localScopeId(SCHEDULE_TYPE, "sc1");
    for (const [type, id] of [
      [SCHEDULE_TYPE, "sc1"],
      [WORKSHIFT_SET_TYPE, "sc1"],
      [WORKSHIFT_SET_TYPE, GLOBAL_WORKSHIFT_SET_ID],
    ] as const) {
      const home = homeScopeOf(type, id) ?? APP_SCOPE_ID;
      expect(readScopeIdOf(world(true, sched), type, id)).toBe(home);
    }
  });

  /**
   * ★ 他の世界を本籍に持つものは、この世界からは「無い」。
   *
   * ここで「本籍の世界へ読みに行く」親切をすると、いま居る世界の話をしているつもりで
   * 別の世界の最新値が現れる。読みが返さないものは判定も「無い」で揃える。
   */
  it("他の世界を本籍に持つものは、この世界からは見えない（グローバルへ逃がさない）", () => {
    const sc1 = localScopeId(SCHEDULE_TYPE, "sc1");
    expect(readScopeIdOf(world(true, sc1), SCHEDULE_TYPE, "sc2")).toBe(sc1);
    expect(homeScopeOf(SCHEDULE_TYPE, "sc2")).toBe(localScopeId(SCHEDULE_TYPE, "sc2"));
  });

  it("固定メンバーはいま居る世界から読む（焼き付けたものを見る）", () => {
    const sched = localScopeId(SCHEDULE_TYPE, "sc1");
    expect(readScopeIdOf(world(true, sched), STAFF_TYPE, "s1")).toBe(sched);
  });

  it("誕生していない世界は存在しないので、台帳が現在の世界", () => {
    const sched = localScopeId(SCHEDULE_TYPE, "sc1");
    expect(readScopeIdOf(world(false, sched), SCHEDULE_TYPE, "sc1")).toBe(APP_SCOPE_ID);
  });
});

/**
 * 「読めない」と「無い」を取り違えると、**見ているだけでデータが壊れる**。
 * その番人（absentInReadScope / loadEditLog の諦め）を固定する。
 */
describe("「読めない」と「無い」を分ける", () => {
  const world = (born: boolean, scopeId: string) =>
    ({ scopeId, born, here: null, app: null }) as unknown as Parameters<
      typeof absentInReadScope
    >[1];

  it("一度も作られていないものは「無い」", () => {
    const store = fakeStore();
    const w = world(false, APP_SCOPE_ID);
    expect(absentInReadScope(store, w, STAFF_TYPE, "s1")).toBe(true);
  });

  it("★ 値が追い出されただけのものを「無い」と言わない", () => {
    const store = fakeStore();
    saveObject(store, STAFF_TYPE, new Staff({ id: "s1", name: "a" }));
    const w = world(false, APP_SCOPE_ID);
    expect(absentInReadScope(store, w, STAFF_TYPE, "s1")).toBe(false);

    // 値だけ落とす。参照は残っているので「無い」ではない
    store.evict(store.lastRefOf(APP_SCOPE_ID, STAFF_TYPE)?.hash as string);
    expect(absentInReadScope(store, w, STAFF_TYPE, "s1")).toBe(false);
  });

  it("★ 判定は読んだのと同じスコープを見る（別スコープを見ると永久に「読み込み中」になる）", () => {
    const store = fakeStore();
    saveObject(store, STAFF_TYPE, new Staff({ id: "s1", name: "a" }));
    const a = createSchedule(store, { storeId: "st", year: 2026, month: 6 });
    const b = createSchedule(store, { storeId: "st", year: 2026, month: 7 });
    const inA = world(true, localScopeId(SCHEDULE_TYPE, a.state.id));

    // 別の勤務表は、この勤務表の世界には居ない。**でもグローバル台帳には居る。**
    // 判定が台帳を見ていると「有る」と答えるのに読みは undefined を返すので、
    // 画面は「読み込み中」から永久に動かない。ここが2つのスコープで答えが割れる点
    expect(absentInReadScope(store, inA, SCHEDULE_TYPE, b.state.id)).toBe(true);
    expect(isAbsentInScope(store, APP_SCOPE_ID, SCHEDULE_TYPE, b.state.id)).toBe(false);

    // 自分の世界のものは、どちらから見ても「有る」
    expect(absentInReadScope(store, inA, SCHEDULE_TYPE, a.state.id)).toBe(false);
  });

  it("id が分からないときは「無い」に倒す（既定値を作る側ではなく、作らない側）", () => {
    const store = fakeStore();
    expect(absentInReadScope(store, world(false, APP_SCOPE_ID), STAFF_TYPE, undefined)).toBe(true);
  });
});

describe("操作履歴が読めないときは、履歴を諦める", () => {
  it("★ 空のログで上書きしない（積み上げた履歴が消える）", () => {
    const store = fakeStore();
    saveObject(store, STAFF_TYPE, new Staff({ id: "s1", name: "a" }));
    const schedule = createSchedule(store, { storeId: "st", year: 2026, month: 6 });
    const scopeId = localScopeId(SCHEDULE_TYPE, schedule.state.id);
    const days = schedule.workingDays();

    let cur: MonthlyStaffSchedule = schedule;
    for (let k = 0; k < 2; k++) {
      cur = recordSetCell(store, {
        schedule: cur,
        constraints: [],
        staffId: "s1",
        staffName: "a",
        day: days[k],
        to: { kind: "day-off" },
      });
    }
    const logBefore = store.lastRefOf(scopeId, "ScheduleEditLog");
    expect(logBefore).toBeDefined();

    // 履歴の値だけ追い出す。参照はグラフに残っている
    store.evict(logBefore?.hash as string);
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    recordSetCell(store, {
      schedule: cur,
      constraints: [],
      staffId: "s1",
      staffName: "a",
      day: days[2],
      to: { kind: "day-off" },
    });

    // 勤務表そのものは記録される。履歴だけ諦める（＝参照が動かない）
    expect(store.lastRefOf(scopeId, "ScheduleEditLog")?.hash).toBe(logBefore?.hash);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
