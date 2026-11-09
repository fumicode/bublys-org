import {
  staffProfileOf,
  STAFF_PROFILE_DICTIONARY_ID,
  type ShiftLeaderRule,
  type Staff,
  type StaffProfile,
  type StaffProfileDictionary,
  type WorkingStaffGroup,
} from "../domain/index.js";
import { useObject } from "../objects/repository.js";
import { STAFF_PROFILE_DICTIONARY_TYPE } from "../objects/hotelObjects.js";

/**
 * スタッフプロファイルの辞書（店舗共通。いまはアプリに1つ）。
 * external なので、勤務表の世界の中から読んでも常にグローバルの最新を見る。無ければ undefined。
 */
export const useStaffProfileDictionary = (): StaffProfileDictionary | undefined =>
  useObject<StaffProfileDictionary>(STAFF_PROFILE_DICTIONARY_TYPE, STAFF_PROFILE_DICTIONARY_ID);

/**
 * その勤務表での、人ごとのスタッフプロファイルを引く関数を作る（#236）。
 * 勤務表・日別バブルの名前の横の記号は、どれもこれで引く（描くのは ui/ProfileMarks）。
 *
 * - 辞書の項目・休みの形 … 勤務メンバーの上書き → その人の既定値
 * - 責任者             … 勤務表の制約セット（leaderRules）
 *
 * 勤務スタッフ群がまだ無い勤務表（群より前に作られたもの）は、既定値だけで読む。
 */
export const staffProfileResolver = ({
  staffList,
  staffGroup,
  dictionary,
  leaderRules,
}: {
  staffList: readonly Staff[];
  staffGroup?: WorkingStaffGroup;
  dictionary?: StaffProfileDictionary;
  leaderRules?: readonly ShiftLeaderRule[];
}): ((staffId: string) => StaffProfile) => {
  const byId = new Map(staffList.map((s) => [s.id, s]));
  const cache = new Map<string, StaffProfile>();
  return (staffId) => {
    const cached = cache.get(staffId);
    if (cached) return cached;
    const profile = staffProfileOf(staffId, {
      staff: byId.get(staffId),
      member: staffGroup?.memberOf(staffId),
      dictionary,
      leaderRules,
    });
    cache.set(staffId, profile);
    return profile;
  };
};
