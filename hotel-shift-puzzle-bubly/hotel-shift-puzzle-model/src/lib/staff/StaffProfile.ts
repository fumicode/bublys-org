/**
 * StaffProfile — スタッフプロファイル（その人に付くものを、1つの見方に束ねたもの。#236）
 *
 * **新しい保存先ではない。** 値の出所がそれぞれ違うものを、読むときに分類ごとへ並べる:
 *
 * | 分類          | 項目                     | 値の出所                                         |
 * |---------------|--------------------------|--------------------------------------------------|
 * | 基本情報      | 所属                     | Staff.department（記号なし＝名前の横に出さない） |
 * | 役割・責任    | 早責・予責・夜責          | 勤務表の制約セット（責任者ルールの ID の並び）   |
 * | 勤務スタイル  | 休みの形                 | Staff の既定 → WorkingStaffMember で上書き       |
 * | 各分類        | 辞書の項目（経験・資格…） | Staff の既定 → WorkingStaffMember で上書き       |
 *
 * 出所を動かさないのは、**保存形を変えない**ため（打ち消しスナップを移行の前後で効かせる）と、
 * 責任者は勤務表ごとに制約バブルで決める、という決まりを保つため。
 *
 * 勤務表の名前の横に出す記号は {@link StaffProfile.marks} の1か所から。見せ方
 * （辞書の値は ProfileValue.markStyle、組み込みの項目は辞書の builtInMarks）で「出す」値だけを
 * 分類の順に並べる。
 *
 * React も store も触らない純粋な組み立て。
 */
import type { ShiftLeaderRule } from "../schedule/ShiftLeaderRule.js";
import type { DayOffStyle } from "./DayOffStyle.js";
import type { Staff } from "./Staff.js";
import type { WorkingStaffMember } from "./WorkingStaffMember.js";
import {
  DEFAULT_BUILT_IN_PROFILE_MARKS,
  profileCategoryOrder,
  type BuiltInProfileItemKey,
  type ProfileCategoryKey,
  type StaffProfileDictionary,
} from "./StaffProfileDictionary.js";

/** 組み込みの項目の ID（辞書の項目 ID と被らないよう「:」で始める） */
export const BUILT_IN_PROFILE_ITEM = {
  department: ":department",
  leaderRoles: ":leaderRoles",
  dayOffStyle: ":dayOffStyle",
} as const;

/**
 * 名前の横に描く記号。何を描くかだけを言い、どう描くか（色・アイコン）は画面が決める。
 *   - symbol      … 辞書の値の記号（🔰 など）や所属。framed なら文字を囲む。label は「経験：新人」
 *   - leader      … 責任者（早責など。役割ごとの色で描く）。staffIds はそのルールの担当者全員
 *                   （押すと関係者を選ぶ）
 *   - dayOffStyle … 休みの形（分散型・連休型のアイコン）
 */
export type ProfileMark =
  | { kind: "symbol"; text: string; label: string; framed: boolean }
  | { kind: "leader"; ruleKey: string; label: string; shiftName: string; staffIds: readonly string[] }
  | { kind: "dayOffStyle"; style: DayOffStyle };

/**
 * 値がどこから来ているか（どの層の値が効いているか）。
 *   - staff    … その人の既定値（店舗）
 *   - member   … この勤務表での上書き
 *   - schedule … 勤務表そのものが決めている（責任者）
 */
export type ProfileSource = "staff" | "member" | "schedule";

export type ProfileEntryValue = {
  id: string;
  label: string;
  mark?: ProfileMark;
};

export type ProfileEntry = {
  category: ProfileCategoryKey;
  itemId: string;
  itemName: string;
  values: ProfileEntryValue[];
  source: ProfileSource;
};

export class StaffProfile {
  constructor(readonly entries: readonly ProfileEntry[]) {}

  /** その分類の項目（組み込み → 辞書の順） */
  entriesIn(category: ProfileCategoryKey): ProfileEntry[] {
    return this.entries.filter((e) => e.category === category);
  }

  entry(itemId: string): ProfileEntry | undefined {
    return this.entries.find((e) => e.itemId === itemId);
  }

  /** 勤務表の名前の横に出す記号。記号のある値だけを、分類の順に */
  get marks(): ProfileMark[] {
    return this.entries.flatMap((e) =>
      e.values.flatMap((v) => (v.mark ? [v.mark] : []))
    );
  }

  /**
   * 名前の横の記号を分類ごとにまとめたもの（分類の順。記号の無い分類は含めない）。
   * 名前の横では分類を横に並べ、同じ分類の中は縦に積む
   */
  get markGroups(): { category: ProfileCategoryKey; marks: ProfileMark[] }[] {
    const groups: { category: ProfileCategoryKey; marks: ProfileMark[] }[] = [];
    for (const e of this.entries) {
      const marks = e.values.flatMap((v) => (v.mark ? [v.mark] : []));
      if (marks.length === 0) continue;
      const last = groups[groups.length - 1];
      if (last?.category === e.category) last.marks.push(...marks);
      else groups.push({ category: e.category, marks });
    }
    return groups;
  }
}

export type StaffProfileSources = {
  /** 名簿の人・臨時の人の実体。引けなければ undefined（辞書の値は上書きだけが効く） */
  staff?: Staff;
  /** その勤務表のメンバー。勤務表の外（スタッフ詳細）で読むときは undefined＝既定値だけ */
  member?: WorkingStaffMember;
  dictionary?: StaffProfileDictionary;
  /** その勤務表の責任者ルール。勤務表の外では渡さない（責任者は勤務表ごとに決める） */
  leaderRules?: readonly ShiftLeaderRule[];
};

/**
 * その人のプロファイルを組み立てる。項目の値を決める規則はここ1か所:
 * 「勤務表での上書きがあればそれ、無ければその人の既定値」（責任者だけは勤務表が決める）。
 */
export function staffProfileOf(
  staffId: string,
  { staff, member, dictionary, leaderRules = [] }: StaffProfileSources
): StaffProfile {
  const entries: ProfileEntry[] = [];

  // 組み込みの項目を名前の横に出すか（辞書が見せ方を持つ。辞書が無ければ既定）
  const shows = (key: BuiltInProfileItemKey) =>
    dictionary ? dictionary.showsBuiltIn(key) : DEFAULT_BUILT_IN_PROFILE_MARKS[key];

  // 基本情報: 所属（部署）。既定は名前の横に出さない。出すなら文字を囲む
  if (staff?.department) {
    entries.push({
      category: "basic",
      itemId: BUILT_IN_PROFILE_ITEM.department,
      itemName: "所属",
      values: [
        {
          id: staff.department,
          label: staff.department,
          ...(shows("department")
            ? {
                mark: {
                  kind: "symbol" as const,
                  text: staff.department,
                  label: `所属：${staff.department}`,
                  framed: true,
                },
              }
            : {}),
        },
      ],
      source: "staff",
    });
  }

  // 役割・責任: 責任者。勤務表の制約セットが担当者を決めている
  const leading = leaderRules.filter((r) => r.leaderStaffIds.includes(staffId));
  if (leading.length > 0) {
    entries.push({
      category: "role",
      itemId: BUILT_IN_PROFILE_ITEM.leaderRoles,
      itemName: "責任者",
      values: leading.map((r) => ({
        id: r.key,
        label: r.label,
        ...(shows("leaderRoles")
          ? {
              mark: {
                kind: "leader" as const,
                ruleKey: r.key,
                label: r.label,
                shiftName: r.shiftName,
                staffIds: r.leaderStaffIds,
              },
            }
          : {}),
      })),
      source: "schedule",
    });
  }

  // 勤務スタイル: 休みの形。上書きがあればそれ、無ければその人の既定値
  if (staff || member) {
    const style = member ? member.dayOffStyleOf(staff) : staff!.dayOffStyle;
    entries.push({
      category: "workStyle",
      itemId: BUILT_IN_PROFILE_ITEM.dayOffStyle,
      itemName: "休みの形",
      values: [
        {
          id: style.state.kind,
          label: style.label,
          ...(shows("dayOffStyle") ? { mark: { kind: "dayOffStyle" as const, style } } : {}),
        },
      ],
      source: member?.hasDayOffStyleOverride ? "member" : "staff",
    });
  }

  // 辞書の項目。上書きがあればそれ、無ければその人の既定値。値が無い項目は並べない
  for (const item of dictionary?.items ?? []) {
    const overridden = member?.profileOverride.has(item.id) ?? false;
    const valueIds = member
      ? member.profileValueIdsOf(item.id, staff)
      : (staff?.profile.valueIdsOf(item.id) ?? []);
    const values = item.resolve(valueIds);
    if (values.length === 0) continue;
    entries.push({
      category: item.category,
      itemId: item.id,
      itemName: item.name,
      values: values.map((v) => ({
        id: v.id,
        label: v.label,
        ...(v.markText
          ? {
              mark: {
                kind: "symbol" as const,
                text: v.markText,
                label: `${item.name}：${v.label}`,
                framed: v.markStyle === "framed",
              },
            }
          : {}),
      })),
      source: overridden ? "member" : "staff",
    });
  }

  // 分類の順に並べる（同じ分類の中は 組み込み → 辞書の順を保つ。sort は安定）
  entries.sort((a, b) => profileCategoryOrder(a.category) - profileCategoryOrder(b.category));
  return new StaffProfile(entries);
}
