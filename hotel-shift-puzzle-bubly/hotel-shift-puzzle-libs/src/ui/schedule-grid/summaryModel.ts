import type {
  MonthlyStaffSchedule,
  WorkShift,
  WorkingDay,
  ShiftLeaderRule,
} from "../../domain/index.js";
import { SHIFT_BG, SHIFT_FG } from "./constants.js";

/**
 * 集計行（責任者ロール＋勤務帯ごと＋休み）。勤務帯はセルと同じ色で色分けし、
 * 必要スタッフ数（分母）を持つ。休み行は必要数の概念が無いので required は undefined。
 */
export type SummaryRow = {
  key: string;
  label: string;
  bg: string;
  fg: string;
  count: (dayIndex: number) => number;
  /** 必要人数（分母）。休みなど必要数の概念が無い行は undefined */
  required?: (dayIndex: number) => number;
  /**
   * 責任者行のとき、その稼働日に担当勤務帯へ責任者が入っているか（◯/✕）。
   * これが定義されている行は人数（count）ではなく ◯/✕ を表示する。
   */
  leaderPresent?: (dayIndex: number) => boolean;
  /** 責任者行のロールキー（例: "early"）。未充足 ✕ から違反バブルを開く導線に使う。 */
  ruleKey?: string;
  /** この人数を超えた日は赤く警告する（休み行の「1日の休み上限」など） */
  warnOver?: number;
};

/**
 * 集計行を組み立てる。
 * 先頭に責任者ロール行（早責/夜責 など）を ◯/✕ で並べ、続いて勤務帯ごとの人数（現在/必要）、
 * 最後に「休み」行を足す。
 * 勤務帯は「名前」で束ねる（同名なら同一勤務帯とみなす）。出現順を保ちつつ同名 ID をまとめ、
 * 色は代表（先頭）勤務帯 ID から引く。
 *
 * leaderRules は解決済み（leaderStaffIds 入り）。担当勤務帯名 → 勤務帯ID群へは
 * shiftOptions のグルーピングで解決し、その勤務帯に責任者が入っているかを判定する。
 */
export function buildSummaryRows(
  schedule: MonthlyStaffSchedule,
  days: WorkingDay[],
  shiftOptions: WorkShift[],
  countsByDay: Map<string, number>[],
  dayOffByDay: number[],
  leaderRules: ShiftLeaderRule[] = [],
  /** true なら責任者行（◯/✕）だけ返す（必要人数・休み行は出さない）。抽出ビュー用 */
  leaderOnly = false,
  /** 1日の休み人数の上限。これを超えた日は休み行を赤く警告する */
  maxDayOffPerDay?: number
): SummaryRow[] {
  const shiftGroups: { name: string; shiftIds: string[] }[] = [];
  const groupIndexByName = new Map<string, number>();
  for (const w of shiftOptions) {
    let idx = groupIndexByName.get(w.name);
    if (idx === undefined) {
      idx = shiftGroups.length;
      groupIndexByName.set(w.name, idx);
      shiftGroups.push({ name: w.name, shiftIds: [] });
    }
    shiftGroups[idx].shiftIds.push(w.id);
  }

  // 勤務帯名 → その名前の勤務帯ID群（責任者がどの勤務帯に入っているかの判定に使う）
  const shiftIdsByName = new Map(
    shiftGroups.map((g) => [g.name, new Set(g.shiftIds)] as const)
  );

  // 責任者ロール行（早責/夜責 など）。充足判定は宣言的ルール（ShiftLeaderRule）に委ねる。
  // 相方裏コマンドと同じ rule.isSatisfiedOn から導出するので、表示とロジックがズレない。
  const leaderRows: SummaryRow[] = leaderRules.map((rule) => ({
    key: `leader:${rule.key}`,
    ruleKey: rule.key,
    label: rule.label,
    bg: "#eceff1",
    fg: "#455a64",
    count: () => 0, // 責任者行は人数表示を使わない（leaderPresent を見る）
    leaderPresent: (i: number) =>
      rule.isSatisfiedOn(
        schedule,
        days[i],
        shiftIdsByName.get(rule.shiftName) ?? new Set<string>()
      ),
  }));

  // 抽出ビューなど：該当制約（責任者ルール）の充足行だけ出す
  if (leaderOnly) return leaderRows;

  return [
    ...leaderRows,
    ...shiftGroups.map((g) => {
      const colorId = g.shiftIds[0];
      return {
        key: `shift:${g.name}`,
        label: g.name,
        bg: SHIFT_BG[colorId] ?? "#eceff1",
        fg: SHIFT_FG[colorId] ?? "#455a64",
        count: (i: number) =>
          g.shiftIds.reduce((sum, id) => sum + (countsByDay[i].get(id) ?? 0), 0),
        required: (i: number) => schedule.requiredFor(days[i], g.name),
      };
    }),
    {
      key: "day-off",
      label: "休み",
      bg: "#f5f5f5",
      fg: "#9e9e9e",
      count: (i: number) => dayOffByDay[i],
      warnOver: maxDayOffPerDay,
    },
  ];
}
