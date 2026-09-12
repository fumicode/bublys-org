/**
 * AutoShiftStep — 段階的に実行できる自動シフトの「1ステップ（コマンド）」の共通型。
 *
 * 自動シフトは1発で全部やるのではなく、目的の違う複数のステップに分ける:
 *   - 希望を叶える（スタッフの希望を反映）
 *   - 必要人数を埋める（需要に足りない帯へ割り当て）
 *   - …今後さらに増える可能性
 *
 * すべてのステップは同じ型（AutoShiftStep）に揃える。これにより UI 側は
 * 登録されたステップ一覧をボタンとして並べ、ユーザーが好きな段階を好きな順で
 * 個別に実行できる。新しいコマンドはこの型で実装してリストに足すだけ。
 *
 * 全ステップ共通の大原則:
 *   1. 既に人間が入力済みのセル（出勤・休み）は絶対に上書きしない（未定セルだけ触る）
 *   2. 休みを希望している人を無理やり勤務させない
 *
 * 純粋・不変。run は新しい勤務表と結果サマリを返す。
 */
import { WorkingDay } from "./WorkingDay.js";
import { MonthlyStaffSchedule } from "./MonthlyStaffSchedule.js";

/** デコード済みの「その日のその人の希望」。希望キーの意味解釈は上位層が行う */
export type DecodedWish =
  /** 希望なし（需要充足の候補になる） */
  | { kind: "neutral" }
  /** 休みたい（休みに確定） */
  | { kind: "day-off" }
  /** この勤務帯に就きたい（1つだけ確定している） */
  | { kind: "work"; shiftId: string }
  /** 希望はあるが自動では決められない（触らず人間へ） */
  | { kind: "ambiguous" };

/** 各ステップが共通で受け取る文脈（希望・可能勤務帯・勤務帯名↔ID など） */
export type AutoShiftContext = {
  /** 割当対象のスタッフID一覧 */
  staffIds: string[];
  /** 勤務帯名 → この勤務表で使う勤務帯ID（需要は名前で持つので実体IDへ解決する） */
  shiftIdByName: Map<string, string>;
  /** 勤務帯ID → 勤務帯名（割当人数を需要の名前粒度で数えるため） */
  shiftNameById: Map<string, string>;
  /** (staffId, day) のデコード済み希望を返す。省略時の人は neutral 扱い */
  preferenceOf: (staffId: string, day: WorkingDay) => DecodedWish;
  /**
   * staffId がその日 shiftId に入れるか。省略時は全可。
   * 「その人が入れる帯か（可能勤務帯）」に加えて「その日は入れないと言っていないか（希望の×）」
   * まで含めた判定を上位層が組み立てて渡す。
   */
  isAvailable?: (staffId: string, shiftId: string, day: WorkingDay) => boolean;
  /** 連勤上限。これを超える出勤割当はしない（既定 5） */
  maxConsecutive?: number;
  /**
   * 月の最低休日数。指定すると「必要人数を埋める」は先にこの日数の休みを確保してから埋める。
   * （先に需要で埋め切ってしまうと、空きセルが無くなって月◯日休めなくなるため）
   */
  minDayOff?: number;
  /** 1日に休んでよい人数の上限。休みを入れるときにこれを超えない。 */
  maxDayOffPerDay?: number;
};

/**
 * makeSatisfyLeaderRulesStep が「他の責任者ルールとの兼ね合いで一意に決め切れず、
 * 未定のまま残した」責任者枠。resolveAmbiguousLeaderSlotsStep がこれを受けて
 * phase違いで複数案（世界線の兄弟ブランチ）を作るのに使う。
 */
export type AmbiguousLeaderSlot = {
  day: WorkingDay;
  ruleKey: string;
  /** 担当勤務帯ID（解決済み。resolver がルールを引き直さなくて済むように） */
  shiftId: string;
  /** なお必要な人数（minCount - 現在の充足数） */
  remainingNeed: number;
  /** 他ルールで必要な人を除外した後もなお残る候補（空 = 全員が他ルールで必要） */
  candidates: string[];
  /** 除外前の候補（candidates が remainingNeed に足りないときのフォールバック） */
  fallbackCandidates: string[];
};

export type AutoShiftStepResult = {
  /** このステップ実行後の勤務表 */
  schedule: MonthlyStaffSchedule;
  /** このステップで新たに確定したセル数 */
  assigned: number;
  /** 人間向けの結果メッセージ */
  message: string;
  /** makeSatisfyLeaderRulesStep 専用。他のステップは省略する */
  ambiguousLeaderSlots?: AmbiguousLeaderSlot[];
};

/** 段階的に実行できる自動シフトの1ステップ（コマンド） */
export interface AutoShiftStep {
  /** 一意なキー（UI識別・将来のURL用） */
  readonly key: string;
  /** 表示名（ボタンのラベル） */
  readonly label: string;
  /** 説明（ツールチップ） */
  readonly description: string;
  /**
   * 同じ目的の別戦略をまとめるグループキー（任意）。
   * 同じ group を持つステップ同士は「切り替えて使う代替アルゴリズム」とみなし、
   * UI はトグルで切り替えられる1組として表示する（例: 必要人数を埋める = 早番から順に / まんべんなく）。
   */
  readonly group?: string;
  /** グループの表示名（同 group のステップで共通。UI は最初の1つを使う） */
  readonly groupLabel?: string;
  /** トグル内でこの戦略を表す短いラベル（例: "まんべんなく"） */
  readonly variantLabel?: string;
  /** 実行。純粋・不変で、新しい勤務表と結果を返す */
  run(schedule: MonthlyStaffSchedule, ctx: AutoShiftContext): AutoShiftStepResult;
}

// ===== ステップ実装で共有するヘルパ =====

const lastDayOf = (d: WorkingDay): number => new Date(d.year, d.month, 0).getDate();
const prevDay = (d: WorkingDay): WorkingDay | null =>
  d.day > 1 ? WorkingDay.of(d.year, d.month, d.day - 1) : null;
const nextDay = (d: WorkingDay): WorkingDay | null =>
  d.day < lastDayOf(d) ? WorkingDay.of(d.year, d.month, d.day + 1) : null;

/**
 * その日に出勤させたとき、day を含む連続出勤区間が上限を超えるか。
 * 連勤の定義は MaxConsecutiveWorkdaysConstraint と同じ（同月内・休み/未定でリセット）。
 */
export const wouldExceedConsecutive = (
  schedule: MonthlyStaffSchedule,
  staffId: string,
  day: WorkingDay,
  max: number
): boolean => {
  let run = 1; // day 自身（出勤と仮定）
  for (let cur = prevDay(day); cur && schedule.isWorking(staffId, cur); cur = prevDay(cur)) run++;
  for (let cur = nextDay(day); cur && schedule.isWorking(staffId, cur); cur = nextDay(cur)) run++;
  return run > max;
};

/** その日・勤務帯名ごとの現在の出勤人数（名前粒度。Pass A の確定なども含む） */
export const countWorkingByName = (
  schedule: MonthlyStaffSchedule,
  day: WorkingDay,
  shiftNameById: Map<string, string>
): Map<string, number> => {
  const m = new Map<string, number>();
  for (const a of schedule.assignmentsOn(day)) {
    const id = a.shiftId;
    if (!id) continue;
    const name = shiftNameById.get(id) ?? id;
    m.set(name, (m.get(name) ?? 0) + 1);
  }
  return m;
};
