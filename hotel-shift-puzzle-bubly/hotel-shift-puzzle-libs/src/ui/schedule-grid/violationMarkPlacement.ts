import type { ConstraintViolation, WorkingDay } from "../../domain/index.js";
import { isShiftIntervalConstraintType } from "../../domain/index.js";

/**
 * violationMarkPlacement — スタッフ行の違反の印を「どのセルに、何列ぶん」置くかを決める
 *
 * ルール: **違反1件に印は1つ。印は違反が覆う範囲の末尾のセルに置き、そこから左へ伸ばす。**
 *
 * 印はセルの中の絶対配置要素なので、行や列の番号を数えずにセルの位置へ自然に追従する。
 * 末尾に置くのは重なり順のため：セル（選択中は z-index:1 の重なりを作る）は DOM の後ろほど
 * 上に描かれるので、先頭に置くと後続の選択中のセルが帯を途中で隠してしまう。末尾から左へ
 * 伸ばせば、帯がかかるセルはすべて DOM で前にあり、帯の下に入る。
 *
 *   range    = 連勤など複数日の違反。末尾のセルから span 列ぶん左へ1本の帯を伸ばす
 *   interval = 勤務間インターバル違反。違反しているのは2日の「間隔」なので、後の日のセルの
 *              左端＝境目に印を置く
 *
 * 単日の違反（希望の食い違い）は希望の円そのものが印なので、ここでは扱わない（円が受け持つ）。
 * 描画から切り離した純粋関数にしてあるので、DOM を用意せずに置き場所を固定できる。
 */
export type ViolationMarkKind = "range" | "interval";

export type ViolationMark = {
  kind: ViolationMarkKind;
  violation: ConstraintViolation;
  /** 印を置くセルの日（表示中で、違反が覆う最後の日）。 */
  anchorDay: WorkingDay;
  /** 印が覆う列の数（置くセル自身を含む）。interval では使わない。 */
  span: number;
};

/** 表示中の日（列）の並びの中で、違反が覆う日の最初と最後の位置。1日も表示されていなければ undefined。 */
const visibleSpan = (
  violation: ConstraintViolation,
  days: readonly WorkingDay[]
): { first: number; last: number } | undefined => {
  let first = -1;
  let last = -1;
  days.forEach((day, i) => {
    if (!violation.coversDay(day)) return;
    if (first < 0) first = i;
    last = i;
  });
  return first < 0 ? undefined : { first, last };
};

/**
 * そのスタッフの違反のうち、セルに重ねて描くものの置き場所を返す。
 * 表示中の日にかからない違反は描かない。勤務間インターバルは境目の後ろ側の日が
 * 見えていなければ描かない（境目が表の外にあるので）。
 */
export function violationMarksOf(
  violations: readonly ConstraintViolation[],
  staffId: string,
  days: readonly WorkingDay[]
): ViolationMark[] {
  const marks: ViolationMark[] = [];
  for (const violation of violations) {
    if (violation.staffId !== staffId) continue;
    const interval = isShiftIntervalConstraintType(violation.constraintType);
    // 単日の違反は希望の円が受け持つ（セルの中）
    if (!interval && violation.days.length <= 1) continue;
    const span = visibleSpan(violation, days);
    if (!span) continue;
    const anchorDay = days[span.last];
    if (interval) {
      const lastDay = violation.days[violation.days.length - 1];
      if (!lastDay || !anchorDay.equals(lastDay) || span.first === span.last) continue;
    }
    marks.push({
      kind: interval ? "interval" : "range",
      violation,
      anchorDay,
      span: span.last - span.first + 1,
    });
  }
  return marks;
}
