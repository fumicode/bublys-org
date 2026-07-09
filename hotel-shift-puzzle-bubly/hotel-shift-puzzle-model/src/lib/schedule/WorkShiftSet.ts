/**
 * WorkShiftSet — 勤務帯セット（勤務帯の集約）
 *
 * 木構造: セット > 勤務帯名（文字列） > 開始時刻（時）。
 * 内部は個々の勤務帯（WorkShift）を平坦なリストで保持し、常に開始時刻の昇順で返す。
 * 同じ名前の勤務帯が開始時刻違いで複数あってよい（例: 早番7:00 と 早番8:00）。
 * 表示側は groupedByName() で「連続する同名」をまとめられる（可能勤務帯バブルの colspan）。
 *
 * 用途は2通り:
 *   - グローバルのテンプレート（id = "global"）
 *   - 勤務表ごとの独自セット（id = scheduleId）。勤務表作成時にグローバルをコピーして作る。
 *
 * 各勤務帯の id は編集（改名・時刻変更・並び替え）で不変。割当・可能勤務帯が id で参照するため。
 * 不変。更新メソッドは新しいインスタンスを返す。
 */
import { WorkShift, type WorkShiftState } from "./WorkShift.js";

export type WorkShiftSetState = {
  id: string;
  /** 勤務帯（順不同で保持。参照時に開始時刻昇順へ整列する） */
  shifts: WorkShiftState[];
};

/** 開始時刻昇順（同時刻は名前→id で安定化） */
function compareShift(a: WorkShiftState, b: WorkShiftState): number {
  if (a.startMinute !== b.startMinute) return a.startMinute - b.startMinute;
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export class WorkShiftSet {
  constructor(readonly state: WorkShiftSetState) {}

  /** 勤務帯の配列からセットを作る */
  static of(id: string, shifts: WorkShift[]): WorkShiftSet {
    return new WorkShiftSet({ id, shifts: shifts.map((s) => s.state) });
  }

  get id(): string {
    return this.state.id;
  }

  /** 開始時刻昇順に整列した勤務帯 */
  get shifts(): WorkShift[] {
    return [...this.state.shifts].sort(compareShift).map((s) => new WorkShift(s));
  }

  /** 開始時刻昇順の勤務帯ID一覧 */
  shiftIds(): string[] {
    return this.shifts.map((s) => s.id);
  }

  findById(id: string): WorkShift | undefined {
    const s = this.state.shifts.find((w) => w.id === id);
    return s ? new WorkShift(s) : undefined;
  }

  /**
   * 開始時刻昇順に並べたうえで「連続する同名」をまとめる。
   * 可能勤務帯バブルのヘッダで名前を colspan するために使う。
   * 例: [早番7:00, 早番8:00, 中番9:00] → [{早番,[7:00,8:00]}, {中番,[9:00]}]
   */
  groupedByName(): { name: string; shifts: WorkShift[] }[] {
    const groups: { name: string; shifts: WorkShift[] }[] = [];
    for (const shift of this.shifts) {
      const last = groups[groups.length - 1];
      if (last && last.name === shift.name) {
        last.shifts.push(shift);
      } else {
        groups.push({ name: shift.name, shifts: [shift] });
      }
    }
    return groups;
  }

  /** 勤務帯を1つ加えた新しいセットを返す。id 採番は呼び出し側の責務。不変。 */
  addShift(shift: WorkShift): WorkShiftSet {
    return new WorkShiftSet({
      ...this.state,
      shifts: [...this.state.shifts, shift.state],
    });
  }

  /** 勤務帯の名前を変えた新しいセットを返す。不変。 */
  rename(id: string, name: string): WorkShiftSet {
    return this.mapShift(id, (s) => s.rename(name));
  }

  /** 勤務帯の開始時刻を変えた新しいセットを返す（時・分指定、分は省略可）。不変。 */
  changeStart(id: string, start: { hour: number; minute?: number }): WorkShiftSet {
    return this.mapShift(id, (s) => s.changeStart(start));
  }

  /** 勤務帯を取り除いた新しいセットを返す。不変。 */
  remove(id: string): WorkShiftSet {
    return new WorkShiftSet({
      ...this.state,
      shifts: this.state.shifts.filter((s) => s.id !== id),
    });
  }

  /** id を差し替えた新しいセットを返す（勤務帯の id は維持）。グローバル→勤務表コピー用。不変。 */
  withId(newId: string): WorkShiftSet {
    return new WorkShiftSet({ id: newId, shifts: this.state.shifts.map((s) => ({ ...s })) });
  }

  private mapShift(id: string, fn: (s: WorkShift) => WorkShift): WorkShiftSet {
    return new WorkShiftSet({
      ...this.state,
      shifts: this.state.shifts.map((s) =>
        s.id === id ? fn(new WorkShift(s)).state : s
      ),
    });
  }
}

/** 既定の勤務帯セット（早番7:00・中番9:00・遅番13:00） */
export function createDefaultWorkShiftSet(id: string): WorkShiftSet {
  return WorkShiftSet.of(id, [
    WorkShift.of("early", "早番", { hour: 7 }, { aliases: ["hayaban", "haya"] }),
    WorkShift.of("middle", "中番", { hour: 9 }, { aliases: ["nakaban", "naka"] }),
    WorkShift.of("late", "遅番", { hour: 13 }, { aliases: ["osoban", "oso"] }),
  ]);
}
