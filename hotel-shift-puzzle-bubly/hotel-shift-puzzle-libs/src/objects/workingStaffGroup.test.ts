/**
 * 勤務スタッフ群が「勤務表の世界の中だけで動く」ことを固定する。
 *
 * 名簿（固定メンバー）と群は似て見えるが、動き方が正反対でなければならない。
 * 名簿は世界の誕生で焼き付いて動かない。群はその世界の中で変わる。
 * ここが混ざると、勤務表で臨時の人を足したらグローバルの名簿に知らない人が現れる、
 * あるいは臨時の人が時間移動で戻らない、という形で静かに壊れる。
 */
import { worldLineGraphSlice } from '@bublys-org/world-line-graph';
import { Staff, WorkingStaffGroup } from '@bublys-org/hotel-shift-puzzle-model';
import { registerObjects } from './framework.js';
import {
  HOTEL_OBJECTS,
  SCHEDULE_TYPE,
  STAFF_TYPE,
  WORKING_STAFF_GROUP_TYPE,
} from './hotelObjects.js';
import {
  APP_SCOPE_ID,
  localScopeId,
  saveObject,
  removeObject,
  readFromScope,
  refsOfTypeInScope,
} from './commit.js';
import { createSchedule } from '../feature/createSchedule.js';

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
    nodeCount: (scopeId: string) =>
      Object.keys(state.worldLineGraph.graphs[scopeId]?.nodes ?? {}).length,
  };
}

function setUp() {
  const store = fakeStore();
  for (let i = 1; i <= 3; i++) {
    saveObject(store, STAFF_TYPE, new Staff({ id: `s${i}`, name: `staff${i}` }));
  }
  const schedule = createSchedule(store, { storeId: 'st', year: 2026, month: 6 });
  const scopeId = localScopeId(SCHEDULE_TYPE, schedule.state.id);
  const readGroup = () =>
    readFromScope<WorkingStaffGroup>(
      store,
      scopeId,
      WORKING_STAFF_GROUP_TYPE,
      schedule.workingStaffGroupId
    ) as WorkingStaffGroup;
  /** グローバル台帳に載っている名簿の顔ぶれ */
  const rosterInApp = () =>
    refsOfTypeInScope(store, APP_SCOPE_ID, STAFF_TYPE)
      .map((ref) => ref.id)
      .sort();
  return { store, schedule, scopeId, readGroup, rosterInApp };
}

describe('勤務スタッフ群（勤務表 → 群 → スタッフ）', () => {
  it('勤務表が生まれると、そのときの名簿全員で群が生まれる（起点と同じ1ノード）', () => {
    const { store, scopeId, readGroup } = setUp();

    expect(readGroup().staffIds()).toEqual(['s1', 's2', 's3']);
    expect(store.nodeCount(scopeId)).toBe(1); // 誕生は1ノード
  });

  it('勤務表は群を workingStaffGroupId で指す（直接スタッフを持たない）', () => {
    const { schedule, readGroup } = setUp();
    expect(schedule.workingStaffGroupId).toBe(schedule.id);
    expect(readGroup().id).toBe(schedule.workingStaffGroupId);
  });

  it('★ 臨時スタッフを足すと、勤務表の世界線が伸びる。グローバルの名簿は増えない', () => {
    const { store, scopeId, readGroup, rosterInApp } = setUp();
    const before = store.nodeCount(scopeId);

    saveObject(
      store,
      WORKING_STAFF_GROUP_TYPE,
      readGroup().addTemporary(new Staff({ id: 'tmp-1', name: '応援 太郎' }))
    );

    expect(store.nodeCount(scopeId)).toBe(before + 1);
    expect(readGroup().staffIds()).toEqual(['s1', 's2', 's3', 'tmp-1']);
    expect(readGroup().isTemporary('tmp-1')).toBe(true);
    // 名簿には出ない。臨時の人の実体は群の中にしか居ない
    expect(rosterInApp()).toEqual(['s1', 's2', 's3']);
  });

  it('★ 臨時スタッフは他の勤務表には現れない', () => {
    const { store, readGroup } = setUp();
    saveObject(
      store,
      WORKING_STAFF_GROUP_TYPE,
      readGroup().addTemporary(new Staff({ id: 'tmp-1', name: '応援 太郎' }))
    );

    const other = createSchedule(store, { storeId: 'st', year: 2026, month: 7 });
    const otherGroup = readFromScope<WorkingStaffGroup>(
      store,
      localScopeId(SCHEDULE_TYPE, other.id),
      WORKING_STAFF_GROUP_TYPE,
      other.workingStaffGroupId
    ) as WorkingStaffGroup;

    expect(otherGroup.staffIds()).toEqual(['s1', 's2', 's3']);
  });

  it('勤務表から人を外しても、グローバルの名簿は動かない', () => {
    const { store, readGroup, rosterInApp } = setUp();

    saveObject(store, WORKING_STAFF_GROUP_TYPE, readGroup().remove('s2'));

    expect(readGroup().staffIds()).toEqual(['s1', 's3']);
    expect(rosterInApp()).toEqual(['s1', 's2', 's3']);
  });

  it('グローバルの名簿から消しても、勤務表の行は変わらない（名簿は焼き付いている）', () => {
    const { store, scopeId, readGroup } = setUp();
    const roster = [
      new Staff({ id: 's1', name: 'staff1' }),
      new Staff({ id: 's2', name: 'staff2' }),
      new Staff({ id: 's3', name: 'staff3' }),
    ];
    const before = store.nodeCount(scopeId);

    removeObject(store, STAFF_TYPE, 's2');

    expect(store.nodeCount(scopeId)).toBe(before); // 勤務表の世界は動かない
    expect(readGroup().resolve(roster).map((s) => s.id)).toEqual(['s1', 's2', 's3']);
  });
});
