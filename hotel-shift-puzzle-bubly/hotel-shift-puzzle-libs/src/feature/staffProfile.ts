import { useMemo } from "react";
import {
  Staff,
  staffProfileOf,
  type ShiftLeaderRule,
  type StaffProfile,
  type WorkingStaffGroup,
} from "../domain/index.js";
import { useWorld } from "../objects/world.js";
import { STAFF_TYPE } from "../objects/hotelObjects.js";

/**
 * その勤務表での、人ごとのスタッフプロファイルを引く関数を作る（#236）。
 * 勤務表・日別バブルの名前の横の記号は、どれもこれで引く（描くのは ui/ProfileMarks）。
 *
 * - 絵文字タグ … Staff.tags（フリーフォーム）
 * - 責任者     … 勤務表の制約セット（leaderRules）
 * - 休みの形   … Staff の既定 → WorkingStaffMember で上書き
 *
 * globalStaffById: タグは pinned の焼き付けが古い可能性があるので、
 * APP スコープの最新 Staff を渡すとそちらのタグを使う。
 */
export const staffProfileResolver = ({
  staffList,
  staffGroup,
  leaderRules,
  globalStaffById,
}: {
  staffList: readonly Staff[];
  staffGroup?: WorkingStaffGroup;
  leaderRules?: readonly ShiftLeaderRule[];
  globalStaffById?: ReadonlyMap<string, Staff>;
}): ((staffId: string) => StaffProfile) => {
  const byId = new Map(staffList.map((s) => [s.id, s]));
  const cache = new Map<string, StaffProfile>();
  return (staffId) => {
    const cached = cache.get(staffId);
    if (cached) return cached;
    let staff = byId.get(staffId);
    // タグだけ APP スコープの最新値を使う（pinned の焼き付けは古い可能性がある）
    if (staff && globalStaffById) {
      const global = globalStaffById.get(staffId);
      if (global && global.tags !== staff.tags) {
        staff = new Staff({
          ...staff.state,
          tags: global.tags.length > 0 ? [...global.tags] : undefined,
        });
      }
    }
    const profile = staffProfileOf(staffId, {
      staff,
      member: staffGroup?.memberOf(staffId),
      leaderRules,
    });
    cache.set(staffId, profile);
    return profile;
  };
};

/**
 * APP スコープの Staff を ID → インスタンスのマップで返す。
 * pinned の焼き付けが古い場合にタグの最新値を引くために使う。
 */
export function useGlobalStaffById(): ReadonlyMap<string, Staff> {
  const world = useWorld();
  const shells = world.app.shells<Staff>(STAFF_TYPE);
  return useMemo(
    () => new Map(shells.map((s) => [s.object.id, s.object])),
    [shells]
  );
}
