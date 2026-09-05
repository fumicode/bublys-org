/**
 * ScheduleEditLog — 勤務表の操作履歴（ノウハウ可視化用）
 *
 * セル編集・自動ステップ・制約変更などの「何をしたか」と、その結果どの制約違反が
 * 増減したか（constraintDelta）を append-only で積む。Schedule と同じ id（scheduleId）を
 * 持ち、勤務表のローカル世界線に相乗りする。時間移動するとその時点までの entries に戻る。
 *
 * 「譲歩（concessions）」= スタッフに紐づく newlyViolated（確定レポートの妥協と同基準）。
 * 不変。state は完全 plain。
 */
import type { ConstraintViolation } from "./ConstraintViolation.js";
import type { ConstraintViolationPlain } from "./ConstraintViolation.js";

export type ScheduleEditActor = "human" | "auto";

export type ScheduleEditKind =
  | "setCell"
  | "autoStep"
  | "constraintEdit"
  | "requiredEdit"
  | "candidate";

export type ScheduleEditTargets = {
  staffId?: string;
  dayKey?: string;
  shiftId?: string;
  stepId?: string;
  label?: string;
};

export type ConstraintDeltaPlain = {
  newlyViolated: ConstraintViolationPlain[];
  newlyResolved: ConstraintViolationPlain[];
  /** スタッフ紐づきの newlyViolated（この操作で受け入れた譲歩） */
  concessions: ConstraintViolationPlain[];
};

/** 操作の由来（学習フィードバック用） */
export type ScheduleEditSource = "manual" | "suggestion" | "autoStep";

export type ScheduleEditEntryPlain = {
  id: string;
  at: string;
  actor: ScheduleEditActor;
  kind: ScheduleEditKind;
  summary: string;
  targets: ScheduleEditTargets;
  constraintDelta: ConstraintDeltaPlain;
  /** 操作の由来。省略時は manual 相当 */
  source?: ScheduleEditSource;
  /** 提案を採用したときの提案ID */
  suggestionId?: string;
  /** 提案を拒否して別の値を入れたときの提案ID */
  rejectedSuggestionId?: string;
};

export type ScheduleEditLogState = {
  /** 勤務表IDと同じ（勤務表1つにログ1つ） */
  id: string;
  entries: ScheduleEditEntryPlain[];
};

/** 違反の同一性キー（差分比較用） */
export function violationIdentityKey(v: ConstraintViolationPlain): string {
  const first = v.dayKeys[0] ?? "";
  const last = v.dayKeys[v.dayKeys.length - 1] ?? "";
  return `${v.constraintType}:${v.staffId ?? "-"}:${first}_${last}`;
}

/**
 * 編集前後の違反リストから差分を作る。
 * concessions = newlyViolated のうち staffId があるもの（日単位違反は譲歩に含めない）。
 */
export function computeConstraintDelta(
  before: ConstraintViolation[],
  after: ConstraintViolation[]
): ConstraintDeltaPlain {
  const beforeMap = new Map(
    before.map((v) => {
      const plain = v.toPlain();
      return [violationIdentityKey(plain), plain] as const;
    })
  );
  const afterMap = new Map(
    after.map((v) => {
      const plain = v.toPlain();
      return [violationIdentityKey(plain), plain] as const;
    })
  );

  const newlyViolated: ConstraintViolationPlain[] = [];
  for (const [key, plain] of afterMap) {
    if (!beforeMap.has(key)) newlyViolated.push(plain);
  }
  const newlyResolved: ConstraintViolationPlain[] = [];
  for (const [key, plain] of beforeMap) {
    if (!afterMap.has(key)) newlyResolved.push(plain);
  }
  const concessions = newlyViolated.filter((v) => v.staffId !== undefined);

  return { newlyViolated, newlyResolved, concessions };
}

export function emptyConstraintDelta(): ConstraintDeltaPlain {
  return { newlyViolated: [], newlyResolved: [], concessions: [] };
}

export class ScheduleEditLog {
  constructor(readonly state: ScheduleEditLogState) {}

  static empty(scheduleId: string): ScheduleEditLog {
    return new ScheduleEditLog({ id: scheduleId, entries: [] });
  }

  get id(): string {
    return this.state.id;
  }

  get entries(): ScheduleEditEntryPlain[] {
    return this.state.entries;
  }

  get latest(): ScheduleEditEntryPlain | undefined {
    return this.state.entries[this.state.entries.length - 1];
  }

  /** 譲歩を1件以上含むエントリだけ */
  entriesWithConcessions(): ScheduleEditEntryPlain[] {
    return this.state.entries.filter((e) => e.constraintDelta.concessions.length > 0);
  }

  /**
   * エントリを末尾に足した新インスタンスを返す（append-only）。
   * entry.id / at が空なら採番する（feature 層で渡してもよい）。
   */
  append(
    entry: Omit<ScheduleEditEntryPlain, "id" | "at"> &
      Partial<Pick<ScheduleEditEntryPlain, "id" | "at">>
  ): ScheduleEditLog {
    const id =
      entry.id ??
      `edit-${this.state.entries.length + 1}-${Date.now().toString(36)}`;
    const at = entry.at ?? new Date().toISOString();
    const full: ScheduleEditEntryPlain = {
      id,
      at,
      actor: entry.actor,
      kind: entry.kind,
      summary: entry.summary,
      targets: entry.targets,
      constraintDelta: entry.constraintDelta,
      source: entry.source,
      suggestionId: entry.suggestionId,
      rejectedSuggestionId: entry.rejectedSuggestionId,
    };
    return new ScheduleEditLog({
      ...this.state,
      entries: [...this.state.entries, full],
    });
  }
}
