/**
 * ScheduleEditLog — 勤務表の操作履歴（ノウハウ可視化用）
 *
 * セル編集・自動ステップ・制約変更などの「何をしたか」と、その結果どの制約違反が
 * 増減したか（{@link ConstraintDelta}）を append-only で積む。Schedule と同じ id（scheduleId）を
 * 持ち、勤務表のローカル世界線に相乗りする。時間移動するとその時点までの entries に戻る。
 *
 * state は1件1件を {@link ScheduleEditEntry} のインスタンスで保持する。
 * シリアライズ用に入れ子まで plain な {@link ScheduleEditLogPlain} を別途定義し、
 * toPlain() / fromPlain() で橋渡しする。不変。
 */
import {
  ScheduleEditEntry,
  type ScheduleEditEntryPlain,
  type ScheduleEditEntryState,
} from "./ScheduleEditEntry.js";

/** state：エントリはインスタンスで保持する */
export type ScheduleEditLogState = {
  /** 勤務表IDと同じ（勤務表1つにログ1つ） */
  id: string;
  entries: ScheduleEditEntry[];
};

/** シリアライズ用：入れ子まで全部 plain */
export type ScheduleEditLogPlain = {
  id: string;
  entries: ScheduleEditEntryPlain[];
};

/** append に渡す形。id / at は省略でき、省略時は採番する */
export type ScheduleEditEntryDraft = Omit<
  ScheduleEditEntryState,
  "id" | "at"
> &
  Partial<Pick<ScheduleEditEntryState, "id" | "at">>;

export class ScheduleEditLog {
  constructor(readonly state: ScheduleEditLogState) {}

  static empty(scheduleId: string): ScheduleEditLog {
    return new ScheduleEditLog({ id: scheduleId, entries: [] });
  }

  get id(): string {
    return this.state.id;
  }

  get entries(): ScheduleEditEntry[] {
    return this.state.entries;
  }

  get latest(): ScheduleEditEntry | undefined {
    return this.state.entries[this.state.entries.length - 1];
  }

  /** 譲歩を1件以上含むエントリだけ */
  entriesWithConcessions(): ScheduleEditEntry[] {
    return this.state.entries.filter((e) => e.hasConcessions);
  }

  /**
   * エントリを末尾に足した新インスタンスを返す（append-only）。
   * entry.id / at が空なら採番する（feature 層で渡してもよい）。
   */
  append(entry: ScheduleEditEntryDraft): ScheduleEditLog {
    const appended = new ScheduleEditEntry({
      ...entry,
      id:
        entry.id ??
        `edit-${this.state.entries.length + 1}-${Date.now().toString(36)}`,
      at: entry.at ?? new Date().toISOString(),
    });
    return new ScheduleEditLog({
      ...this.state,
      entries: [...this.state.entries, appended],
    });
  }

  // ========== シリアライズ ==========

  toPlain(): ScheduleEditLogPlain {
    return {
      id: this.state.id,
      entries: this.state.entries.map((e) => e.toPlain()),
    };
  }

  static fromPlain(plain: ScheduleEditLogPlain): ScheduleEditLog {
    return new ScheduleEditLog({
      id: plain.id,
      entries: plain.entries.map(ScheduleEditEntry.fromPlain),
    });
  }
}
