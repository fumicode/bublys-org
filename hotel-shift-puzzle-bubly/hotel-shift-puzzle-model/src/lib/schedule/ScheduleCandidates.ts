/**
 * ScheduleCandidates — 勤務表の「まだ決まっていないセルに入れられる値」の集合
 *
 * 未定セルごとに合法な候補（ShiftCell[]）を持つ値オブジェクト。確定済みのセルは持たない
 * （＝ここに載っているセルの集合が「まだ決まっていないところ」そのもの）。
 *
 * この形にしておくと、候補数だけで3つの状態が言い分けられる:
 *   - 1件 → 一意に決まった（確定提案の対象）
 *   - 0件 → 何を入れても制約に反する（詰み）
 *   - 2件以上 → まだ人の判断に委ねる
 *
 * 勤務表から都度導出できる派生データなので、世界線には載せない（永続化しない）。
 * worker との受け渡しのために toPlain() / fromPlain() を備える。不変。
 */
import type { ShiftCell } from "./MonthlyStaffSchedule.js";
import { WorkingDay } from "./WorkingDay.js";

/** 候補集合のキー（"staffId:2026-06-01"） */
export function candidateCellKey(staffId: string, dayKey: string): string {
  return `${staffId}:${dayKey}`;
}

/** 候補集合が指すセル（スタッフ×稼働日） */
export type CandidateCell = {
  staffId: string;
  day: WorkingDay;
};

/** 候補が1つに絞られたセルと、その値 */
export type ForcedCell = CandidateCell & {
  cell: ShiftCell;
};

export type ScheduleCandidatesState = {
  scheduleId: string;
  /** "staffId:dayKey" → そのセルに入れられる合法な候補。未定セルの分だけ持つ */
  byCell: Record<string, ShiftCell[]>;
};

export type ScheduleCandidatesPlain = ScheduleCandidatesState;

/** キーを staffId と dayKey に分解する（dayKey 側に ":" は入らない） */
function splitCellKey(key: string): { staffId: string; dayKey: string } {
  const sep = key.lastIndexOf(":");
  return { staffId: key.slice(0, sep), dayKey: key.slice(sep + 1) };
}

export class ScheduleCandidates {
  constructor(readonly state: ScheduleCandidatesState) {}

  static empty(scheduleId: string): ScheduleCandidates {
    return new ScheduleCandidates({ scheduleId, byCell: {} });
  }

  get scheduleId(): string {
    return this.state.scheduleId;
  }

  /** そのセルの候補（確定済み・範囲外なら undefined） */
  candidatesOf(staffId: string, day: WorkingDay): ShiftCell[] | undefined {
    return this.state.byCell[candidateCellKey(staffId, day.key)];
  }

  /** そのセルの候補数（確定済み・範囲外なら undefined） */
  countOf(staffId: string, day: WorkingDay): number | undefined {
    return this.candidatesOf(staffId, day)?.length;
  }

  /** 候補を差し替えた新インスタンスを返す */
  withCell(
    staffId: string,
    day: WorkingDay,
    candidates: ShiftCell[]
  ): ScheduleCandidates {
    return new ScheduleCandidates({
      ...this.state,
      byCell: {
        ...this.state.byCell,
        [candidateCellKey(staffId, day.key)]: candidates,
      },
    });
  }

  /** そのセルを候補集合から外した新インスタンスを返す（確定したセル用） */
  withoutCell(staffId: string, day: WorkingDay): ScheduleCandidates {
    const key = candidateCellKey(staffId, day.key);
    if (!(key in this.state.byCell)) return this;
    const byCell = { ...this.state.byCell };
    delete byCell[key];
    return new ScheduleCandidates({ ...this.state, byCell });
  }

  /**
   * 候補が1つに絞られたセル（＝制約から論理的に一意に決まった手）。
   * 稼働日の昇順 → スタッフID順で返す（表示側が並べ替えやすいよう決定的にする）。
   */
  forcedCells(): ForcedCell[] {
    return this.sortedEntries()
      .filter(([, candidates]) => candidates.length === 1)
      .map(([key, candidates]) => {
        const { staffId, dayKey } = splitCellKey(key);
        return {
          staffId,
          day: WorkingDay.fromKey(dayKey),
          cell: candidates[0],
        };
      });
  }

  /** 候補が0件のセル（＝何を入れても制約に反する＝詰み） */
  deadCells(): CandidateCell[] {
    return this.sortedEntries()
      .filter(([, candidates]) => candidates.length === 0)
      .map(([key]) => {
        const { staffId, dayKey } = splitCellKey(key);
        return { staffId, day: WorkingDay.fromKey(dayKey) };
      });
  }

  /** 候補を持つセルの総数（＝まだ決まっていないセルの数） */
  get size(): number {
    return Object.keys(this.state.byCell).length;
  }

  private sortedEntries(): Array<[string, ShiftCell[]]> {
    return Object.entries(this.state.byCell).sort(([a], [b]) => {
      const left = splitCellKey(a);
      const right = splitCellKey(b);
      if (left.dayKey !== right.dayKey) {
        return left.dayKey < right.dayKey ? -1 : 1;
      }
      return left.staffId < right.staffId ? -1 : left.staffId > right.staffId ? 1 : 0;
    });
  }

  toPlain(): ScheduleCandidatesPlain {
    return { scheduleId: this.state.scheduleId, byCell: this.state.byCell };
  }

  static fromPlain(plain: ScheduleCandidatesPlain): ScheduleCandidates {
    return new ScheduleCandidates({
      scheduleId: plain.scheduleId,
      byCell: plain.byCell,
    });
  }
}
