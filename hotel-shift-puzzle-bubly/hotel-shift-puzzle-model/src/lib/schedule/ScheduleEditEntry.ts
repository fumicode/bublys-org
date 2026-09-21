/**
 * ScheduleEditEntry — 操作履歴の1件
 *
 * 「誰が・何を・どうしたか」と、その結果として制約違反がどう増減したか
 * （{@link ConstraintDelta}）を持つ。{@link ScheduleEditLog} に append-only で積まれる。
 *
 * state は差分をインスタンスで保持する。シリアライズ用に入れ子まで plain な
 * {@link ScheduleEditEntryPlain} を別途定義し、toPlain() / fromPlain() で橋渡しする。
 * 不変。
 */
import { ConstraintDelta, type ConstraintDeltaPlain } from "./ConstraintDelta.js";

export type ScheduleEditActor = "human" | "auto";

export type ScheduleEditKind =
  | "setCell"
  | "autoStep"
  | "constraintEdit"
  | "requiredEdit"
  | "candidate"
  /** 勤務スタッフ群の変更（臨時スタッフの追加・除外・並び替え） */
  | "membershipEdit";

export type ScheduleEditTargets = {
  staffId?: string;
  dayKey?: string;
  shiftId?: string;
  stepId?: string;
  label?: string;
};

/** 操作の由来（学習フィードバック用） */
export type ScheduleEditSource = "manual" | "suggestion" | "autoStep";

/** state：違反差分はインスタンスで保持する */
export type ScheduleEditEntryState = {
  id: string;
  at: string;
  actor: ScheduleEditActor;
  kind: ScheduleEditKind;
  summary: string;
  targets: ScheduleEditTargets;
  constraintDelta: ConstraintDelta;
  /** 操作の由来。省略時は manual 相当 */
  source?: ScheduleEditSource;
  /** 提案を採用したときの提案ID */
  suggestionId?: string;
  /** 提案を拒否して別の値を入れたときの提案ID */
  rejectedSuggestionId?: string;
};

/** シリアライズ用：入れ子まで全部 plain */
export type ScheduleEditEntryPlain = Omit<
  ScheduleEditEntryState,
  "constraintDelta"
> & {
  constraintDelta: ConstraintDeltaPlain;
};

export class ScheduleEditEntry {
  constructor(readonly state: ScheduleEditEntryState) {}

  get id(): string {
    return this.state.id;
  }

  /** 記録時刻（ISO 8601） */
  get at(): string {
    return this.state.at;
  }

  get actor(): ScheduleEditActor {
    return this.state.actor;
  }

  get kind(): ScheduleEditKind {
    return this.state.kind;
  }

  get summary(): string {
    return this.state.summary;
  }

  get targets(): ScheduleEditTargets {
    return this.state.targets;
  }

  get constraintDelta(): ConstraintDelta {
    return this.state.constraintDelta;
  }

  get source(): ScheduleEditSource | undefined {
    return this.state.source;
  }

  get suggestionId(): string | undefined {
    return this.state.suggestionId;
  }

  get rejectedSuggestionId(): string | undefined {
    return this.state.rejectedSuggestionId;
  }

  /** この操作で譲歩を受け入れたか */
  get hasConcessions(): boolean {
    return this.state.constraintDelta.concessions.length > 0;
  }

  // ========== シリアライズ ==========

  toPlain(): ScheduleEditEntryPlain {
    return {
      ...this.state,
      constraintDelta: this.state.constraintDelta.toPlain(),
    };
  }

  static fromPlain(plain: ScheduleEditEntryPlain): ScheduleEditEntry {
    return new ScheduleEditEntry({
      ...plain,
      constraintDelta: ConstraintDelta.fromPlain(plain.constraintDelta),
    });
  }
}
