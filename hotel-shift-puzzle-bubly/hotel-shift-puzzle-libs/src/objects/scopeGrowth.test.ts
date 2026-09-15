/**
 * 「どの操作で、どのスコープの世界線が伸びるか」を固定する。
 *
 * ここが狂うと、世界線ビューで見ている絵の意味が変わる。
 * とくに「勤務表を編集したのに勤務表の世界線が伸びない（アプリ全体だけ伸びる）」は、
 * 時間移動でその編集に戻れないことを意味するので、静かに壊れると気づけない。
 */
import { worldLineGraphSlice } from '@bublys-org/world-line-graph';
import { MonthlyStaffSchedule, Staff } from '@bublys-org/hotel-shift-puzzle-model';
import { registerObjects } from './framework.js';
import { HOTEL_OBJECTS, SCHEDULE_TYPE, STAFF_TYPE } from './hotelObjects.js';
import { APP_SCOPE_ID, localScopeId, saveObject } from './commit.js';
import { createSchedule } from '../feature/createSchedule.js';
import { recordSetCell } from '../feature/recordScheduleEdit.js';

registerObjects(HOTEL_OBJECTS);

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
    /** スコープID → ノード数 */
    counts: () =>
      Object.fromEntries(
        Object.entries(state.worldLineGraph.graphs).map(([k, g]) => [
          k,
          Object.keys(g.nodes).length,
        ])
      ) as Record<string, number>,
  };
}

function setUp() {
  const store = fakeStore();
  for (let i = 1; i <= 3; i++) {
    saveObject(store, STAFF_TYPE, new Staff({ id: `s${i}`, name: `staff${i}` }));
  }
  const schedule = createSchedule(store, { storeId: 'st', year: 2026, month: 6 });
  const scopeId = localScopeId(SCHEDULE_TYPE, schedule.state.id);
  return { store, schedule, scopeId };
}

describe('どの操作でどのスコープが伸びるか', () => {
  it('勤務表を作ると、その勤務表の世界線が1ノードで生まれる', () => {
    const { store, scopeId } = setUp();
    expect(store.counts()[scopeId]).toBe(1);
  });

  it('★ セルを編集すると、勤務表の世界線が伸びる（アプリ全体だけが伸びるのではない）', () => {
    const { store, schedule, scopeId } = setUp();
    const before = store.counts()[scopeId];
    const days = schedule.workingDays();

    let cur: MonthlyStaffSchedule = schedule;
    for (let k = 0; k < 3; k++) {
      cur = recordSetCell(store, {
        schedule: cur,
        staffId: 's1',
        day: days[k],
        to: { kind: 'day-off' },
      });
    }

    // 1操作＝1ノード。勤務表は誕生の起点に載っているので、起点が差し込まれることもない
    expect(store.counts()[scopeId]).toBe(before + 3);
  });

  /**
   * 伸び方の単位が違う: 勤務表の世界線は「1操作＝1ノード」、アプリ全体スコープは平坦な
   * 変更ログなので「オブジェクトごとに1ノード」。
   * セル編集は勤務表1つしか動かさないので、両方とも同じだけ伸びる。
   * （勤務スタッフの除外のように複数の集約が動く操作では、アプリ全体のほうが速く伸びる）
   * ここが変わると世界線ビューの読み方が変わるので固定する。
   */
  it('セル編集では、勤務表の世界線とアプリ全体スコープが同じだけ伸びる', () => {
    const { store, schedule, scopeId } = setUp();
    const localBefore = store.counts()[scopeId];
    const appBefore = store.counts()[APP_SCOPE_ID];
    const days = schedule.workingDays();

    let cur: MonthlyStaffSchedule = schedule;
    for (let k = 0; k < 5; k++) {
      cur = recordSetCell(store, {
        schedule: cur,
        staffId: 's1',
        day: days[k],
        to: { kind: 'day-off' },
      });
    }

    const localGrew = store.counts()[scopeId] - localBefore;
    const appGrew = store.counts()[APP_SCOPE_ID] - appBefore;
    expect(localGrew).toBe(5); // 勤務表の世界線も必ず伸びる
    expect(appGrew).toBe(localGrew);
  });

  it('セル編集はアプリ全体スコープにも記録される（全世界の最新値インデックス）', () => {
    const { store, schedule } = setUp();
    const before = store.counts()[APP_SCOPE_ID];
    recordSetCell(store, {
      schedule,
      staffId: 's1',
      day: schedule.workingDays()[0],
      to: { kind: 'day-off' },
    });
    expect(store.counts()[APP_SCOPE_ID]).toBeGreaterThan(before);
  });

  it('他の勤務表の世界線は伸びない（編集は自分の世界にだけ載る）', () => {
    const { store, schedule } = setUp();
    const other = createSchedule(store, { storeId: 'st', year: 2026, month: 7 });
    const otherScope = localScopeId(SCHEDULE_TYPE, other.state.id);
    const before = store.counts()[otherScope];

    recordSetCell(store, {
      schedule,
      staffId: 's1',
      day: schedule.workingDays()[0],
      to: { kind: 'day-off' },
    });

    expect(store.counts()[otherScope]).toBe(before);
  });

  /**
   * ★ 同じ状態に戻したら、新しい世界を作らずに元の世界へ戻る（#137 / #155）。
   *
   * 世界の同一性は、そのノードに載っている全オブジェクトのハッシュで決まる。
   * 編集のたびに必ず変わるもの（時刻入りの記録など）を同じノードに載せると、
   * 中身を元に戻しても二度と一致せず、世界線が伸び続ける。
   */
  it('★ セルを A → B → A と戻すと、元のノードへ戻る（世界線が伸びない）', () => {
    const { store, schedule, scopeId } = setUp();
    const day = schedule.workingDays()[0];
    const apexOf = () => store.getState().worldLineGraph.graphs[scopeId].apexNodeId;
    const nodeA = apexOf();

    const toB = recordSetCell(store, {
      schedule,
      staffId: 's1',
      day,
      to: { kind: 'day-off' },
    });
    expect(apexOf()).not.toBe(nodeA);
    const countAfterB = store.counts()[scopeId];

    recordSetCell(store, {
      schedule: toB,
      staffId: 's1',
      day,
      to: { kind: 'undecided' },
    });

    expect(store.counts()[scopeId]).toBe(countAfterB);
    expect(apexOf()).toBe(nodeA);
  });

  it('スタッフの改名は、勤務表の世界線を伸ばさない（固定メンバーだから）', () => {
    const { store, scopeId } = setUp();
    const before = store.counts()[scopeId];
    const appBefore = store.counts()[APP_SCOPE_ID];

    saveObject(store, STAFF_TYPE, new Staff({ id: 's1', name: 'staff1(改)' }));

    // グローバル台帳は伸びる。勤務表の世界は動かない
    expect(store.counts()[APP_SCOPE_ID]).toBeGreaterThan(appBefore);
    expect(store.counts()[scopeId]).toBe(before);
  });
});
