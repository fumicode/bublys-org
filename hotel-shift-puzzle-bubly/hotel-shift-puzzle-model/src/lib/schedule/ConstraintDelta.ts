/**
 * ConstraintDelta — 1つの操作で、制約違反がどう増減したか
 *
 * 「この一手で何が壊れて、何が直ったか」を持つ値オブジェクト。操作履歴
 * （{@link ScheduleEditEntry}）に載り、譲歩（concessions）の読み取りに使う。
 *
 * **譲歩** = newlyViolated のうち staffId があるもの。日単位の違反（必要人数など）は
 * 誰かに我慢させたわけではないので譲歩に含めない。
 *
 * state は違反をインスタンスで保持する。シリアライズ用に入れ子まで plain な
 * {@link ConstraintDeltaPlain} を別途定義し、toPlain() / fromPlain() で橋渡しする。
 * 不変。
 */
import {
  ConstraintViolation,
  type ConstraintViolationPlain,
} from "./ConstraintViolation.js";

/** state：違反はインスタンスで保持する */
export type ConstraintDeltaState = {
  newlyViolated: ConstraintViolation[];
  newlyResolved: ConstraintViolation[];
  /** スタッフ紐づきの newlyViolated（この操作で受け入れた譲歩） */
  concessions: ConstraintViolation[];
};

/** シリアライズ用：入れ子まで全部 plain */
export type ConstraintDeltaPlain = {
  newlyViolated: ConstraintViolationPlain[];
  newlyResolved: ConstraintViolationPlain[];
  concessions: ConstraintViolationPlain[];
};

/** 違反の同一性キー（差分比較用） */
export function violationIdentityKey(violation: ConstraintViolation): string {
  const dayKeys = violation.days.map((d) => d.key);
  const first = dayKeys[0] ?? "";
  const last = dayKeys[dayKeys.length - 1] ?? "";
  return `${violation.constraintType}:${violation.staffId ?? "-"}:${first}_${last}`;
}

export class ConstraintDelta {
  constructor(readonly state: ConstraintDeltaState) {}

  /** 何も変わらなかった差分 */
  static empty(): ConstraintDelta {
    return new ConstraintDelta({
      newlyViolated: [],
      newlyResolved: [],
      concessions: [],
    });
  }

  /** 編集前後の違反リストから差分を作る */
  static between(
    before: ConstraintViolation[],
    after: ConstraintViolation[]
  ): ConstraintDelta {
    const beforeKeys = new Set(before.map(violationIdentityKey));
    const afterKeys = new Set(after.map(violationIdentityKey));
    const newlyViolated = after.filter(
      (v) => !beforeKeys.has(violationIdentityKey(v))
    );
    return new ConstraintDelta({
      newlyViolated,
      newlyResolved: before.filter((v) => !afterKeys.has(violationIdentityKey(v))),
      // 日単位の違反は誰かに我慢させたわけではないので譲歩に数えない
      concessions: newlyViolated.filter((v) => v.staffId !== undefined),
    });
  }

  get newlyViolated(): ConstraintViolation[] {
    return this.state.newlyViolated;
  }

  get newlyResolved(): ConstraintViolation[] {
    return this.state.newlyResolved;
  }

  /** この操作で受け入れた譲歩（スタッフに紐づく新しい違反） */
  get concessions(): ConstraintViolation[] {
    return this.state.concessions;
  }

  // ========== シリアライズ ==========

  toPlain(): ConstraintDeltaPlain {
    return {
      newlyViolated: this.state.newlyViolated.map((v) => v.toPlain()),
      newlyResolved: this.state.newlyResolved.map((v) => v.toPlain()),
      concessions: this.state.concessions.map((v) => v.toPlain()),
    };
  }

  static fromPlain(plain: ConstraintDeltaPlain): ConstraintDelta {
    return new ConstraintDelta({
      newlyViolated: plain.newlyViolated.map(ConstraintViolation.fromPlain),
      newlyResolved: plain.newlyResolved.map(ConstraintViolation.fromPlain),
      concessions: plain.concessions.map(ConstraintViolation.fromPlain),
    });
  }
}

/** 編集前後の違反リストから差分を作る（{@link ConstraintDelta.between} の別名） */
export function computeConstraintDelta(
  before: ConstraintViolation[],
  after: ConstraintViolation[]
): ConstraintDelta {
  return ConstraintDelta.between(before, after);
}

/** 何も変わらなかった差分（{@link ConstraintDelta.empty} の別名） */
export function emptyConstraintDelta(): ConstraintDelta {
  return ConstraintDelta.empty();
}
