/**
 * 「その世界から見たとき、そのオブジェクトはどういう立場か」を固定する。
 *
 * ここが狂うと世界線3Dビューの絵が嘘になる。とくに
 * 「グローバル台帳の板に固定メンバーの印が出る」は、台帳には誕生も焼き付けも
 * 無いのに焼き付いているように読めてしまうので、静かに壊れると誤読を招く。
 */
import { registerObjects } from "./framework.js";
import {
  HOTEL_OBJECTS,
  SCHEDULE_TYPE,
  STAFF_TYPE,
  GLOBAL_WORKSHIFT_SET_ID,
  WORKSHIFT_SET_TYPE,
} from "./hotelObjects.js";
import { APP_SCOPE_ID, localScopeId } from "./commit.js";
import { hotelCellRole, hotelNestedScope } from "./worldLineViewQueries.js";

registerObjects(HOTEL_OBJECTS);

const SCHED = localScopeId(SCHEDULE_TYPE, "sc1");
const role = (type: string, id: string, scopeId: string) =>
  hotelCellRole({ type, id }, scopeId);

describe("世界から見たオブジェクトの立場", () => {
  it("★ スタッフは勤務表の世界では固定（焼き付けられて動かない）", () => {
    expect(role(STAFF_TYPE, "s1", SCHED)).toBe("pinned");
  });

  it("★ 同じスタッフでも、グローバル台帳では立場を持たない", () => {
    // 台帳は「世界」ではない。誕生も焼き付けも無いので、そこに固定と書いたら嘘
    expect(role(STAFF_TYPE, "s1", APP_SCOPE_ID)).toBeNull();
  });

  it("勤務表そのものは、その勤務表の世界で変化する（live）", () => {
    expect(role(SCHEDULE_TYPE, "sc1", SCHED)).toBe("live");
  });

  it("他の勤務表の世界から見たら、立場を持たない（そこには居ない）", () => {
    expect(role(SCHEDULE_TYPE, "sc1", localScopeId(SCHEDULE_TYPE, "sc2"))).toBeNull();
  });

  it("勤務帯セットは id で変わる。勤務表用はメンバー、グローバル版は立場なし", () => {
    expect(role(WORKSHIFT_SET_TYPE, "sc1", SCHED)).toBe("live");
    expect(role(WORKSHIFT_SET_TYPE, GLOBAL_WORKSHIFT_SET_ID, SCHED)).toBeNull();
  });

  it("世界に属さない型（外のもの）は、どの世界でも立場を持たない", () => {
    expect(role("ScheduleReport", "sc1:node", SCHED)).toBeNull();
    expect(role("StaffMonthlyShiftWish", "s1:2026-06", SCHED)).toBeNull();
  });

  it("バブル配置のような世界でないスコープでは何も言わない", () => {
    expect(role(STAFF_TYPE, "s1", "root")).toBeNull();
  });
});

describe("入れ子の世界線の導出", () => {
  const nest = (type: string, id: string, cur: string) =>
    hotelNestedScope({ type, id }, cur);

  it("本籍がそのまま入れ子の答えになる", () => {
    expect(nest(SCHEDULE_TYPE, "sc1", APP_SCOPE_ID)).toBe(SCHED);
    expect(nest(WORKSHIFT_SET_TYPE, "sc1", APP_SCOPE_ID)).toBe(SCHED);
  });

  it("いま居る世界と同じなら入れ子ではない（自分の中に自分は居ない）", () => {
    expect(nest(SCHEDULE_TYPE, "sc1", SCHED)).toBeNull();
  });

  it("本籍を持たない型は入れ子を持たない", () => {
    expect(nest(STAFF_TYPE, "s1", APP_SCOPE_ID)).toBeNull();
    expect(nest(WORKSHIFT_SET_TYPE, GLOBAL_WORKSHIFT_SET_ID, APP_SCOPE_ID)).toBeNull();
  });
});
