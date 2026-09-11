/**
 * createSchedule — 勤務表を作る ＝ その世界が生まれる
 *
 * 「勤務表を作る」は、世界線スコープ `Schedule:<id>` の**誕生**そのもの。
 * 起点ノードには次の一式が1ノードで載る:
 *   - 持ち主一式 … 勤務表・勤務帯セット・制約セット（どちらもグローバルのコピー）・勤務スタッフ群
 *   - 固定メンバー … そのときのスタッフ名簿（参照のコピー。以後この世界では動かない）
 *
 * 名簿（固定メンバー）と勤務スタッフ群は役割が違う。名簿は「そのとき居た人たち」を
 * 焼き付けた台帳で、以後この世界では動かない。群は「そのうち誰がこの勤務表で働くか」で、
 * 世界の中で変わる（臨時の人を足す・外す・並べ替える）。生まれた瞬間だけは同じ顔ぶれ。
 *
 * 以前は repo.save を3回呼んでいたが、それだと1回目の save で世界が生まれてしまい、
 * 起点に勤務帯セットも可能勤務帯も固定メンバーも載らない（そこへ時間移動しても戻らない）。
 * 誕生は1回・1ノード、が守るべきルール。
 */
import {
  MonthlyStaffSchedule,
  WorkShiftSet,
  createDefaultWorkShiftSet,
  WorkingStaffGroup,
  ConstraintSet,
} from "@bublys-org/hotel-shift-puzzle-model";
import {
  APP_SCOPE_ID,
  adoptGlobalValue,
  commitToScope,
  ensureWorldBorn,
  localScopeId,
  pinnableRefs,
  type BundleItem,
} from "../objects/commit.js";
import {
  SCHEDULE_TYPE,
  WORKSHIFT_SET_TYPE,
  WORKING_STAFF_GROUP_TYPE,
  CONSTRAINT_SET_TYPE,
  GLOBAL_WORKSHIFT_SET_ID,
  GLOBAL_CONSTRAINT_SET_ID,
} from "../objects/hotelObjects.js";

type StoreLike = {
  getState: () => {
    worldLineGraph?: {
      graphs?: Record<string, unknown>;
      cas?: Record<string, unknown>;
    };
  };
  dispatch: (action: unknown) => void;
};

/** 新しい勤務表の ID を生成する（採番は feature 層の仕事。ドメインは採番しない） */
export const newScheduleId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `sched-${Date.now()}`;

export function createSchedule(
  store: StoreLike,
  params: { storeId: string; year: number; month: number }
): MonthlyStaffSchedule {
  const id = newScheduleId();
  const scopeId = localScopeId(SCHEDULE_TYPE, id);

  const schedule = MonthlyStaffSchedule.create({ id, ...params });

  // グローバルの勤務帯セットをこの勤務表用のコピーにする（id を差し替えた別オブジェクト）。
  // 未投入なら既定セットへフォールバック。
  const workShiftSet =
    adoptGlobalValue<WorkShiftSet>(
      store,
      WORKSHIFT_SET_TYPE,
      (global) => global.withId(id),
      GLOBAL_WORKSHIFT_SET_ID
    ) ?? createDefaultWorkShiftSet(id);

  // 制約セットも同じ形でコピーする。グローバルで整えた責任者ルール・上限が、
  // 新しい勤務表の出発点になる。未投入なら既定値だけの空セット。
  const constraintSet =
    adoptGlobalValue<ConstraintSet>(
      store,
      CONSTRAINT_SET_TYPE,
      (global) => global.withId(schedule.constraintSetId),
      GLOBAL_CONSTRAINT_SET_ID
    ) ?? ConstraintSet.empty(schedule.constraintSetId);

  // 固定メンバー。**参照**だけを見るので、値が CAS から追い出されていても取りこぼさない。
  // 勤務スタッフ群はこの参照の id から作る（値を読まないのが要点）。
  const pinnedRefs = pinnableRefs(store, SCHEDULE_TYPE);
  const staffIds = pinnedRefs.map((ref) => ref.id);
  // 生まれたときは名簿の全員が働き、可能勤務帯は絞らない（＝どの勤務帯にも入れる）。
  // ここから先、誰が働くかも誰がどこに入れるかも、この世界の中だけで変わる。
  const staffGroup = WorkingStaffGroup.ofRoster(schedule.workingStaffGroupId, staffIds);

  const seed: BundleItem[] = [
    { type: SCHEDULE_TYPE, obj: schedule },
    { type: WORKSHIFT_SET_TYPE, obj: workShiftSet },
    { type: WORKING_STAFF_GROUP_TYPE, obj: staffGroup },
    { type: CONSTRAINT_SET_TYPE, obj: constraintSet },
  ];

  // 誕生（1ノード）。持ち主一式は seed の値から、固定メンバーは記述子の pinTypes から載る。
  ensureWorldBorn(store, scopeId, seed);

  // アプリ全体スコープ（全世界の最新値インデックス）にも反映する。
  // 勤務表一覧はここを読むので、これが無いと作った勤務表が一覧に出ない。
  for (const { type, obj } of seed) commitToScope(store, APP_SCOPE_ID, type, obj);

  return schedule;
}
