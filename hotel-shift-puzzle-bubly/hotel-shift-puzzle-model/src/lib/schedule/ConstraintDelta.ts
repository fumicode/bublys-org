/**
 * ConstraintDelta — 1つの手で、制約違反がどう増減したか
 *
 * 「この一手で何が壊れて、何が直ったか」を持つ値オブジェクト。
 * セルの候補集合（その値を入れると何が壊れるか）や、詰みの解消案（何が直って何を払うか）
 * の読み取りに使う。
 *
 * 不変。
 */
import { ConstraintViolation } from "./ConstraintViolation.js";

export type ConstraintDeltaState = {
  newlyViolated: ConstraintViolation[];
  newlyResolved: ConstraintViolation[];
};

/**
 * 手を打ったあとの違反が、前より悪いか。**新しく出た違反か、同じ違反の量が増えたもの**を悪いとする
 * （休み上限を超えた日にさらに休みを置く＝同じ違反のまま超えた人数が増える、を見落とさない）。
 */
export function isWorse(
  after: ConstraintViolation,
  beforeAmounts: ReadonlyMap<string, number>
): boolean {
  const before = beforeAmounts.get(violationIdentityKey(after));
  return before === undefined || after.amount > before;
}

/** 違反の同一性キー（差分比較用） */
export function violationIdentityKey(violation: ConstraintViolation): string {
  const dayKeys = violation.days.map((d) => d.key);
  const first = dayKeys[0] ?? "";
  const last = dayKeys[dayKeys.length - 1] ?? "";
  return `${violation.constraintType}:${violation.staffId ?? "-"}:${first}_${last}`;
}

export class ConstraintDelta {
  constructor(readonly state: ConstraintDeltaState) {}

  /** 手を打つ前後の違反リストから差分を作る */
  static between(
    before: ConstraintViolation[],
    after: ConstraintViolation[]
  ): ConstraintDelta {
    const beforeAmounts = new Map(before.map((v) => [violationIdentityKey(v), v.amount]));
    const afterKeys = new Set(after.map(violationIdentityKey));
    return new ConstraintDelta({
      newlyViolated: after.filter((v) => isWorse(v, beforeAmounts)),
      newlyResolved: before.filter((v) => !afterKeys.has(violationIdentityKey(v))),
    });
  }

  get newlyViolated(): ConstraintViolation[] {
    return this.state.newlyViolated;
  }

  get newlyResolved(): ConstraintViolation[] {
    return this.state.newlyResolved;
  }
}

/** 手を打つ前後の違反リストから差分を作る（{@link ConstraintDelta.between} の別名） */
export function computeConstraintDelta(
  before: ConstraintViolation[],
  after: ConstraintViolation[]
): ConstraintDelta {
  return ConstraintDelta.between(before, after);
}
